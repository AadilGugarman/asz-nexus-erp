/**
 * hooks/useFileSystem.ts
 * Reusable hook for all filesystem operations.
 *
 * Wraps ipc.fs.* with loading/error state and toast notifications.
 * Caches the allowed roots on first call so components don't need to
 * fetch them repeatedly.
 *
 * Usage:
 *   const fs = useFileSystem();
 *
 *   // Save invoice as PDF
 *   await fs.saveInvoicePdf('INV-001', pdfBase64);
 *
 *   // Export report as CSV
 *   await fs.exportCsv('Sales Report', headers, rows);
 *
 *   // Open a file dialog and read the selected file
 *   const content = await fs.pickAndReadText({
 *     title: 'Import Data',
 *     filters: [{ name: 'JSON', extensions: ['json'] }],
 *   });
 *
 *   // Save dialog → write bytes
 *   await fs.pickSaveAndWriteBytes('report.pdf', pdfBase64, [
 *     { name: 'PDF', extensions: ['pdf'] },
 *   ]);
 */

import { useCallback, useRef } from 'react';
import { ipc } from '@/ipc';
import type {
  FsDialogFilter,
  FsDialogOpenRequest,
  FsExportCsvRequest,
  FsExportJsonRequest,
} from '@/ipc';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseFileSystemReturn {
  /** Resolve a filename against the desktop (or first allowed root). */
  desktopPath(filename: string): Promise<string>;

  /** Resolve a filename against the downloads directory. */
  downloadsPath(filename: string): Promise<string>;

  /** Resolve a filename against the documents directory. */
  documentsPath(filename: string): Promise<string>;

  /**
   * Save a PDF to the desktop.
   * Shows a toast on success/failure.
   * Returns the final saved path, or null on error.
   */
  saveInvoicePdf(
    invoiceNo: string,
    pdfBase64: string,
    opts?: { dir?: string; showToast?: boolean },
  ): Promise<string | null>;

  /**
   * Show a save dialog then write PDF bytes.
   * Returns the saved path, or null if cancelled/error.
   */
  saveInvoicePdfWithDialog(
    invoiceNo: string,
    pdfBase64: string,
  ): Promise<string | null>;

  /**
   * Export rows as a CSV file to the desktop.
   * Returns the final saved path, or null on error.
   */
  exportCsv(
    filename: string,
    headers: string[],
    rows: string[][],
    opts?: { dir?: string; showToast?: boolean },
  ): Promise<string | null>;

  /**
   * Export rows as a CSV file — shows a save dialog first.
   * Returns the saved path, or null if cancelled/error.
   */
  exportCsvWithDialog(
    defaultFilename: string,
    headers: string[],
    rows: string[][],
  ): Promise<string | null>;

  /**
   * Export data as a JSON file to the desktop.
   * Returns the final saved path, or null on error.
   */
  exportJson(
    filename: string,
    data: unknown,
    opts?: { dir?: string; showToast?: boolean },
  ): Promise<string | null>;

  /**
   * Show a file-open dialog and return the text content of the selected file.
   * Returns null if cancelled or on error.
   */
  pickAndReadText(opts?: FsDialogOpenRequest): Promise<string | null>;

  /**
   * Show a file-open dialog and return the base64 bytes of the selected file.
   * Returns null if cancelled or on error.
   */
  pickAndReadBytes(opts?: FsDialogOpenRequest): Promise<string | null>;

  /**
   * Show a save dialog then write bytes to the chosen path.
   * Returns the saved path, or null if cancelled/error.
   */
  pickSaveAndWriteBytes(
    defaultFilename: string,
    dataBase64: string,
    filters?: FsDialogFilter[],
  ): Promise<string | null>;

  /** Open a folder picker dialog. Returns the chosen path or null. */
  pickFolder(title?: string): Promise<string | null>;

  /** Low-level access to the raw ipc.fs module. */
  raw: typeof ipc.fs;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFileSystem(): UseFileSystemReturn {
  // Cache allowed roots so we only fetch once per component lifetime.
  const rootsCache = useRef<string[] | null>(null);

  // ── Internal helpers ────────────────────────────────────────────────────────

  const getRoots = useCallback(async (): Promise<string[]> => {
    if (rootsCache.current) return rootsCache.current;
    const { roots } = await ipc.fs.getAllowedRoots();
    rootsCache.current = roots;
    return roots;
  }, []);

  const findRoot = useCallback(
    async (keyword: string): Promise<string> => {
      const roots = await getRoots();
      const match = roots.find((r) =>
        r.toLowerCase().replace(/\\/g, '/').includes(keyword.toLowerCase()),
      );
      return match ?? roots[0] ?? '';
    },
    [getRoots],
  );

  const joinPath = (dir: string, filename: string): string => {
    const sep = dir.includes('\\') ? '\\' : '/';
    return dir.endsWith(sep) ? `${dir}${filename}` : `${dir}${sep}${filename}`;
  };

  // ── Public API ──────────────────────────────────────────────────────────────

  const desktopPath = useCallback(
    async (filename: string) => joinPath(await findRoot('desktop'), filename),
    [findRoot],
  );

  const downloadsPath = useCallback(
    async (filename: string) => joinPath(await findRoot('download'), filename),
    [findRoot],
  );

  const documentsPath = useCallback(
    async (filename: string) => joinPath(await findRoot('document'), filename),
    [findRoot],
  );

  const saveInvoicePdf = useCallback(
    async (
      invoiceNo: string,
      pdfBase64: string,
      opts: { dir?: string; showToast?: boolean } = {},
    ): Promise<string | null> => {
      try {
        const dir = opts.dir ?? (await findRoot('desktop'));
        const path = joinPath(dir, `Invoice-${invoiceNo}.pdf`);
        const result = await ipc.fs.savePdf({
          path,
          data_b64: pdfBase64,
          create_dirs: true,
          unique: true,
        });
        if (opts.showToast !== false) {
          showSuccess(`Invoice saved to ${result.path}`);
        }
        return result.path;
      } catch (err) {
        showError('Failed to save invoice PDF', err);
        return null;
      }
    },
    [findRoot],
  );

  const saveInvoicePdfWithDialog = useCallback(
    async (invoiceNo: string, pdfBase64: string): Promise<string | null> => {
      try {
        const desktop = await findRoot('desktop');
        const dialogResult = await ipc.fs.dialogSave({
          title: 'Save Invoice PDF',
          default_path: joinPath(desktop, `Invoice-${invoiceNo}.pdf`),
          filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        });
        if (dialogResult.cancelled || !dialogResult.path) return null;

        const result = await ipc.fs.savePdf({
          path: dialogResult.path,
          data_b64: pdfBase64,
          create_dirs: true,
          unique: false,
        });
        showSuccess(`Invoice saved to ${result.path}`);
        return result.path;
      } catch (err) {
        showError('Failed to save invoice PDF', err);
        return null;
      }
    },
    [findRoot],
  );

  const exportCsv = useCallback(
    async (
      filename: string,
      headers: string[],
      rows: string[][],
      opts: { dir?: string; showToast?: boolean } = {},
    ): Promise<string | null> => {
      try {
        const dir = opts.dir ?? (await findRoot('desktop'));
        const path = joinPath(dir, filename.endsWith('.csv') ? filename : `${filename}.csv`);
        const req: FsExportCsvRequest = {
          path,
          headers,
          rows,
          create_dirs: true,
          unique: true,
        };
        const result = await ipc.fs.exportCsv(req);
        if (opts.showToast !== false) {
          showSuccess(`Report exported to ${result.path}`);
        }
        return result.path;
      } catch (err) {
        showError('Failed to export CSV', err);
        return null;
      }
    },
    [findRoot],
  );

  const exportCsvWithDialog = useCallback(
    async (
      defaultFilename: string,
      headers: string[],
      rows: string[][],
    ): Promise<string | null> => {
      try {
        const desktop = await findRoot('desktop');
        const name = defaultFilename.endsWith('.csv')
          ? defaultFilename
          : `${defaultFilename}.csv`;
        const dialogResult = await ipc.fs.dialogSave({
          title: 'Export CSV',
          default_path: joinPath(desktop, name),
          filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        });
        if (dialogResult.cancelled || !dialogResult.path) return null;

        const req: FsExportCsvRequest = {
          path: dialogResult.path,
          headers,
          rows,
          create_dirs: true,
          unique: false,
        };
        const result = await ipc.fs.exportCsv(req);
        showSuccess(`Report exported to ${result.path}`);
        return result.path;
      } catch (err) {
        showError('Failed to export CSV', err);
        return null;
      }
    },
    [findRoot],
  );

  const exportJson = useCallback(
    async (
      filename: string,
      data: unknown,
      opts: { dir?: string; showToast?: boolean } = {},
    ): Promise<string | null> => {
      try {
        const dir = opts.dir ?? (await findRoot('desktop'));
        const path = joinPath(dir, filename.endsWith('.json') ? filename : `${filename}.json`);
        const req: FsExportJsonRequest = {
          path,
          json: JSON.stringify(data, null, 2),
          create_dirs: true,
          unique: true,
        };
        const result = await ipc.fs.exportJson(req);
        if (opts.showToast !== false) {
          showSuccess(`Data exported to ${result.path}`);
        }
        return result.path;
      } catch (err) {
        showError('Failed to export JSON', err);
        return null;
      }
    },
    [findRoot],
  );

  const pickAndReadText = useCallback(
    async (opts: FsDialogOpenRequest = {}): Promise<string | null> => {
      try {
        const dialogResult = await ipc.fs.dialogOpen({ ...opts, multiple: false });
        if (dialogResult.cancelled || !dialogResult.paths?.length) return null;
        const { content } = await ipc.fs.readText(dialogResult.paths[0]);
        return content;
      } catch (err) {
        showError('Failed to read file', err);
        return null;
      }
    },
    [],
  );

  const pickAndReadBytes = useCallback(
    async (opts: FsDialogOpenRequest = {}): Promise<string | null> => {
      try {
        const dialogResult = await ipc.fs.dialogOpen({ ...opts, multiple: false });
        if (dialogResult.cancelled || !dialogResult.paths?.length) return null;
        const { data_b64 } = await ipc.fs.readBytes(dialogResult.paths[0]);
        return data_b64;
      } catch (err) {
        showError('Failed to read file', err);
        return null;
      }
    },
    [],
  );

  const pickSaveAndWriteBytes = useCallback(
    async (
      defaultFilename: string,
      dataBase64: string,
      filters?: FsDialogFilter[],
    ): Promise<string | null> => {
      try {
        const desktop = await findRoot('desktop');
        const dialogResult = await ipc.fs.dialogSave({
          default_path: joinPath(desktop, defaultFilename),
          filters,
        });
        if (dialogResult.cancelled || !dialogResult.path) return null;
        const result = await ipc.fs.writeBytes(dialogResult.path, dataBase64, true, false);
        showSuccess(`File saved to ${result.path}`);
        return result.path;
      } catch (err) {
        showError('Failed to save file', err);
        return null;
      }
    },
    [findRoot],
  );

  const pickFolder = useCallback(async (title?: string): Promise<string | null> => {
    try {
      const result = await ipc.fs.dialogOpen({ title, directory: true });
      if (result.cancelled || !result.paths?.length) return null;
      return result.paths[0];
    } catch (err) {
      showError('Failed to pick folder', err);
      return null;
    }
  }, []);

  return {
    desktopPath,
    downloadsPath,
    documentsPath,
    saveInvoicePdf,
    saveInvoicePdfWithDialog,
    exportCsv,
    exportCsvWithDialog,
    exportJson,
    pickAndReadText,
    pickAndReadBytes,
    pickSaveAndWriteBytes,
    pickFolder,
    raw: ipc.fs,
  };
}

// ── Toast helpers (uses sonner if available, falls back to console) ────────────

function showSuccess(message: string): void {
  try {
    // Dynamic import avoids a hard dependency — works even if sonner isn't used.
    import('sonner').then(({ toast }) => toast.success(message)).catch(() => {
      console.info('[fs]', message);
    });
  } catch {
    console.info('[fs]', message);
  }
}

function showError(message: string, err: unknown): void {
  const detail = err instanceof Error ? err.message : String(err);
  try {
    import('sonner').then(({ toast }) => toast.error(`${message}: ${detail}`)).catch(() => {
      if (import.meta.env.DEV) console.error('[fs]', message, detail);
    });
  } catch {
    if (import.meta.env.DEV) console.error('[fs]', message, detail);
  }
}
