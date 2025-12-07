import type { Request } from 'express';

declare module 'multer' {
  export interface StorageEngine {
    _handleFile(
      req: Request,
      file: unknown,
      callback: (error?: Error | null, info?: unknown) => void,
    ): void;
    _removeFile(
      req: Request,
      file: unknown,
      callback: (error: Error | null) => void,
    ): void;
  }

  export interface DiskStorageOptions<File = unknown> {
    destination?:
      | string
      | ((
          req: Request,
          file: File,
          callback: (error: Error | null, destination: string) => void,
        ) => void);
    filename?: (
      req: Request,
      file: File,
      callback: (error: Error | null, filename: string) => void,
    ) => void;
  }

  export function diskStorage<File = unknown>(
    options?: DiskStorageOptions<File>,
  ): StorageEngine;
}
