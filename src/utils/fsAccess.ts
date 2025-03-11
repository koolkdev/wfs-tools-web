/**
 * Response from file saving operations
 */
export interface SaveResponse {
  success: boolean;
  fileHandle?: FileSystemFileHandle;
  error?: string;
}

/**
 * Response from file picking operations
 */
export interface PickerResponse {
  success: boolean;
  handles?: FileSystemFileHandle[];
  error?: string;
}

/**
 * Response from directory picking operations
 */
export interface DirectoryPickerResponse {
  success: boolean;
  dirHandle?: FileSystemDirectoryHandle;
  error?: string;
}

/**
 * Options for file picker
 */
export interface FilePickerOptions {
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  multiple?: boolean;
}

/**
 * Check if the File System Access API is available
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showOpenFilePicker' in window;
}

/**
 * Opens a file picker and saves data to the selected file.
 */
export async function saveFileWithPicker(
  data: ArrayBuffer,
  suggestedName: string,
): Promise<SaveResponse> {
  try {
    // Check if File System Access API is available
    if (!isFileSystemAccessSupported()) {
      return {
        success: false,
        error: 'File System Access API is not supported in this browser.',
      };
    }

    // Show the save file picker
    const fileHandle = await window.showSaveFilePicker({
      suggestedName,
    });

    // Create a writable stream
    const writable = await fileHandle.createWritable();

    // Write the data
    await writable.write(data);

    // Close the stream
    await writable.close();

    return { success: true, fileHandle };
  } catch (error) {
    // User cancelled is not an error
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'User cancelled the operation' };
    }

    console.error('Error saving file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.toString() : String(error),
    };
  }
}

/**
 * Returns an array of file handles from the file picker.
 */
export async function showOpenFilePicker(options: FilePickerOptions = {}): Promise<PickerResponse> {
  try {
    // Check if File System Access API is available
    if (!isFileSystemAccessSupported()) {
      return {
        success: false,
        error: 'File System Access API is not supported in this browser.',
      };
    }

    // Use native File System Access API
    const handles = await window.showOpenFilePicker(options);
    return { success: true, handles };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'User cancelled file selection' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.toString() : String(error),
    };
  }
}

/**
 * Returns a directory handle from the directory picker.
 */
export async function showDirectoryPicker(): Promise<DirectoryPickerResponse> {
  try {
    // Check if File System Access API is available
    if (!isFileSystemAccessSupported()) {
      return {
        success: false,
        error: 'File System Access API is not supported in this browser.',
      };
    }

    const dirHandle = await window.showDirectoryPicker();
    return { success: true, dirHandle };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'User cancelled directory selection' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.toString() : String(error),
    };
  }
}
