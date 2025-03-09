// File System Access API type declarations
declare interface Window {
  showOpenFilePicker(options?: {
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
    multiple?: boolean;
  }): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: { suggestedName?: string }): Promise<FileSystemFileHandle>;
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
}
