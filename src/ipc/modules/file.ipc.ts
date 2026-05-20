/**
 * ipc/modules/file.ipc.ts
 * Frontend IPC module for file system commands.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *
 *   // Write a file
 *   const result = await ipc.file.writeTextFile({
 *     path: '/home/user/export.json',
 *     content: JSON.stringify(data),
 *     create_dirs: true,
 *   });
 *
 *   // Read a file
 *   const { content } = await ipc.file.readTextFile({ path: '/home/user/data.json' });
 *
 *   // Stat a path
 *   const info = await ipc.file.statPath({ path: '/home/user/data.json' });
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  WriteFileRequest,
  WriteFileResponse,
  ReadFileRequest,
  ReadFileResponse,
  StatPathRequest,
  PathInfo,
} from '../types';

export const fileIpc = {
  /**
   * Write UTF-8 text content to a file on disk.
   * Set create_dirs: true to auto-create parent directories.
   */
  writeTextFile(request: WriteFileRequest): Promise<WriteFileResponse> {
    return ipcInvoke<WriteFileResponse>(
      CMD.file.writeTextFile,
      { payload: request },
    );
  },

  /**
   * Read UTF-8 text content from a file on disk.
   * Throws IpcCallError with code NOT_FOUND if the file doesn't exist.
   */
  readTextFile(request: ReadFileRequest): Promise<ReadFileResponse> {
    return ipcInvoke<ReadFileResponse>(
      CMD.file.readTextFile,
      { payload: request },
    );
  },

  /**
   * Stat a path — check existence, type, and size without reading content.
   * Never throws NOT_FOUND; returns { exists: false } instead.
   */
  statPath(request: StatPathRequest): Promise<PathInfo> {
    return ipcInvoke<PathInfo>(
      CMD.file.statPath,
      { payload: request },
      // Browser fallback
      { exists: false, is_file: false, is_dir: false, size_bytes: null },
    );
  },
};
