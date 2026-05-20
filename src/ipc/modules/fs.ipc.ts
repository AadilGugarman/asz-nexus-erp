/**
 * ipc/modules/fs.ipc.ts
 * Secure filesystem IPC module.
 *
 * All paths must be absolute and inside an allowed root (app-data, desktop,
 * documents, or downloads). The backend enforces this — the frontend does not
 * need to validate paths itself.
 *
 * Binary data (PDFs, images) is transferred as base64 strings.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *
 *   // Open a native file dialog
 *   const { paths, cancelled } = await ipc.fs.dialogOpen({
 *     title: 'Import CSV',
 *     filters: [{ name: 'CSV Files', extensions: ['csv'] }],
 *   });
 *
 *   // Save a PDF invoice
 *   const pdfB64 = generatePdfBase64(invoiceData);
 *   const { path } = await ipc.fs.savePdf({
 *     path: `${desktopDir}/Invoice-${no}.pdf`,
 *     data_b64: pdfB64,
 *   });
 *
 *   // Export report as CSV
 *   await ipc.fs.exportCsv({
 *     path: `${desktopDir}/report.csv`,
 *     headers: ['Date', 'Customer', 'Amount'],
 *     rows: data.map(r => [r.date, r.name, String(r.amount)]),
 *   });
 *
 *   // Get allowed roots to build default paths
 *   const { roots } = await ipc.fs.getAllowedRoots();
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  FsFileInfo,
  FsDirEntry,
  FsReadTextResponse,
  FsWriteTextResponse,
  FsReadBytesResponse,
  FsWriteBytesResponse,
  FsCopyResponse,
  FsSavePdfResponse,
  FsSavePdfRequest,
  FsDialogOpenRequest,
  FsDialogOpenResponse,
  FsDialogSaveRequest,
  FsDialogSaveResponse,
  FsAllowedRootsResponse,
  FsExportCsvRequest,
  FsExportJsonRequest,
} from '../types';

// ── Browser-mode fallbacks ────────────────────────────────────────────────────

const FALLBACK_FILE_INFO: FsFileInfo = {
  path: '', name: '', exists: false,
  is_file: false, is_dir: false,
  size_bytes: null, modified: null,
};

const FALLBACK_DIALOG_OPEN: FsDialogOpenResponse = { paths: null, cancelled: true };
const FALLBACK_DIALOG_SAVE: FsDialogSaveResponse = { path: null, cancelled: true };
const FALLBACK_ROOTS: FsAllowedRootsResponse = { roots: [] };

// ── Module ────────────────────────────────────────────────────────────────────

export const fsIpc = {
  /**
   * Stat a path — existence, type, size, modified time.
   * Never throws NOT_FOUND; returns `{ exists: false }` instead.
   */
  stat(path: string): Promise<FsFileInfo> {
    return ipcInvoke<FsFileInfo>(
      CMD.fs.stat,
      { payload: { path } },
      FALLBACK_FILE_INFO,
    );
  },

  /**
   * List directory contents (one level deep).
   * Throws NOT_FOUND if the directory does not exist.
   */
  listDir(path: string): Promise<FsDirEntry[]> {
    return ipcInvoke<FsDirEntry[]>(
      CMD.fs.listDir,
      { payload: { path } },
      [],
    );
  },

  /**
   * Read UTF-8 text from a file.
   * Throws NOT_FOUND if the file does not exist.
   */
  readText(path: string): Promise<FsReadTextResponse> {
    return ipcInvoke<FsReadTextResponse>(
      CMD.fs.readText,
      { payload: { path } },
    );
  },

  /**
   * Write UTF-8 text to a file.
   * @param path        - Absolute destination path
   * @param content     - Text content to write
   * @param create_dirs - Auto-create parent directories (default: false)
   * @param unique      - Append ` (1)` suffix if file exists (default: false)
   */
  writeText(
    path: string,
    content: string,
    create_dirs = false,
    unique = false,
  ): Promise<FsWriteTextResponse> {
    return ipcInvoke<FsWriteTextResponse>(
      CMD.fs.writeText,
      { payload: { path, content, create_dirs, unique } },
    );
  },

  /**
   * Read raw bytes from a file, returned as a base64 string.
   * Use for importing binary files (images, PDFs, etc.).
   */
  readBytes(path: string): Promise<FsReadBytesResponse> {
    return ipcInvoke<FsReadBytesResponse>(
      CMD.fs.readBytes,
      { payload: { path } },
    );
  },

  /**
   * Write raw bytes (supplied as base64) to a file.
   * Use for downloading binary files.
   */
  writeBytes(
    path: string,
    data_b64: string,
    create_dirs = false,
    unique = false,
  ): Promise<FsWriteBytesResponse> {
    return ipcInvoke<FsWriteBytesResponse>(
      CMD.fs.writeBytes,
      { payload: { path, data_b64, create_dirs, unique } },
    );
  },

  /**
   * Copy a file from src to dst.
   */
  copy(src: string, dst: string, create_dirs = false): Promise<FsCopyResponse> {
    return ipcInvoke<FsCopyResponse>(
      CMD.fs.copy,
      { payload: { src, dst, create_dirs } },
    );
  },

  /**
   * Delete a file or directory.
   * Throws NOT_FOUND if the path does not exist.
   */
  delete(path: string): Promise<boolean> {
    return ipcInvoke<boolean>(
      CMD.fs.delete,
      { payload: { path } },
    );
  },

  /**
   * Export data as a CSV file.
   * The backend handles CSV escaping — pass raw cell values.
   * `unique` defaults to true (auto-suffix if file exists).
   */
  exportCsv(request: FsExportCsvRequest): Promise<FsWriteTextResponse> {
    return ipcInvoke<FsWriteTextResponse>(
      CMD.fs.exportCsv,
      { payload: request },
    );
  },

  /**
   * Export data as a JSON file.
   * `json` must be a valid JSON string (use JSON.stringify).
   * `unique` defaults to true (auto-suffix if file exists).
   */
  exportJson(request: FsExportJsonRequest): Promise<FsWriteTextResponse> {
    return ipcInvoke<FsWriteTextResponse>(
      CMD.fs.exportJson,
      { payload: request },
    );
  },

  /**
   * Save a PDF from base64-encoded bytes.
   * The backend validates the PDF magic bytes before writing.
   * `unique` defaults to true (auto-suffix if file exists).
   *
   * Typical flow:
   *   1. Render HTML invoice to PDF in the browser (jsPDF / html2canvas)
   *   2. Get the base64 string from the PDF library
   *   3. Call ipc.fs.savePdf({ path, data_b64 })
   */
  savePdf(request: FsSavePdfRequest): Promise<FsSavePdfResponse> {
    return ipcInvoke<FsSavePdfResponse>(
      CMD.fs.savePdf,
      { payload: request },
    );
  },

  /**
   * Show a native file-open dialog.
   * Returns `{ cancelled: true, paths: null }` if the user dismisses.
   *
   * @example
   *   const result = await ipc.fs.dialogOpen({
   *     title: 'Select CSV',
   *     filters: [{ name: 'CSV', extensions: ['csv'] }],
   *   });
   *   if (!result.cancelled && result.paths) {
   *     const content = await ipc.fs.readText(result.paths[0]);
   *   }
   */
  dialogOpen(request: FsDialogOpenRequest = {}): Promise<FsDialogOpenResponse> {
    return ipcInvoke<FsDialogOpenResponse>(
      CMD.fs.dialogOpen,
      { payload: request },
      FALLBACK_DIALOG_OPEN,
    );
  },

  /**
   * Show a native file-save dialog.
   * Returns `{ cancelled: true, path: null }` if the user dismisses.
   *
   * @example
   *   const result = await ipc.fs.dialogSave({
   *     title: 'Save Invoice',
   *     default_path: `${desktop}/Invoice-001.pdf`,
   *     filters: [{ name: 'PDF', extensions: ['pdf'] }],
   *   });
   *   if (!result.cancelled && result.path) {
   *     await ipc.fs.savePdf({ path: result.path, data_b64: pdfB64 });
   *   }
   */
  dialogSave(request: FsDialogSaveRequest = {}): Promise<FsDialogSaveResponse> {
    return ipcInvoke<FsDialogSaveResponse>(
      CMD.fs.dialogSave,
      { payload: request },
      FALLBACK_DIALOG_SAVE,
    );
  },

  /**
   * Return the list of allowed root directories.
   * Use this to build default export paths without hard-coding OS paths.
   *
   * @example
   *   const { roots } = await ipc.fs.getAllowedRoots();
   *   const desktop = roots.find(r => r.toLowerCase().includes('desktop')) ?? roots[0];
   */
  getAllowedRoots(): Promise<FsAllowedRootsResponse> {
    return ipcInvoke<FsAllowedRootsResponse>(
      CMD.fs.getAllowedRoots,
      undefined,
      FALLBACK_ROOTS,
    );
  },
};
