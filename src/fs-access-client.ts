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
 * Opens a file picker and saves data to the selected file.
 * This function can be called directly from ASYNCIFY-enabled C++ code.
 */
export async function mySaveFileWithPicker(
  data: ArrayBuffer,
  suggestedName: string,
): Promise<SaveResponse> {
  try {
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
 * This function can be called directly from ASYNCIFY-enabled C++ code.
 */
export async function myShowOpenFilePicker(
  options: FilePickerOptions = {},
): Promise<PickerResponse> {
  try {
    // If File System Access API is not available, fall back to input element
    if (!window.showOpenFilePicker) {
      return new Promise<PickerResponse>((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';

        if (options.multiple) {
          input.multiple = true;
        }

        // Set accept attribute if types are specified
        if (options.types && options.types.length > 0) {
          const accept = options.types
            .flatMap(type => (type.accept ? Object.values(type.accept) : []))
            .flat()
            .join(',');

          if (accept) {
            input.accept = accept;
          }
        }

        input.addEventListener('change', () => {
          if (input.files && input.files.length > 0) {
            // Create handles from files
            const handles = Array.from(input.files).map(file => {
              // Create a mock file handle that matches FileSystemFileHandle interface
              return {
                getFile: async () => file,
                kind: 'file' as const,
                name: file.name,
                // Add missing required methods
                createWritable: async () => {
                  throw new Error('createWritable not supported in fallback mode');
                },
                isSameEntry: async () => {
                  throw new Error('isSameEntry not supported in fallback mode');
                },
              } satisfies FileSystemFileHandle;
            });

            resolve({ success: true, handles });
          } else {
            reject({ success: false, error: 'No file selected' });
          }
        });

        input.addEventListener('cancel', () => {
          reject({ success: false, error: 'File selection cancelled' });
        });

        // Trigger the file input
        input.click();
      });
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
 * This function can be called directly from ASYNCIFY-enabled C++ code.
 */
export async function myShowDirectoryPicker(): Promise<DirectoryPickerResponse> {
  try {
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
