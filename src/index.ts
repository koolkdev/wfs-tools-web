// Function to create a ReadableByteStream from a WFS file
async function createReadableByteStream(file: WfsFile) {
  // Get a reader for the file
  const fileStream = await file.getStream();
  const fileSize = await file.getSize();
  let position = 0;

  return new ReadableStream({
    type: 'bytes', // This is a byte stream

    start(controller) {
      // Nothing special needed for initialization
      console.log(`Stream started. File size: ${fileSize} bytes`);
    },

    async pull(controller: ReadableStreamDefaultController) {
      try {
        // Get the view from the BYOB request
        const byobRequest = (controller as ReadableByteStreamController).byobRequest;
        const view = byobRequest?.view;
        if (!view) {
          throw new Error('No BYOB request available');
        }

        // Check if we've reached the end of the file
        if (position >= fileSize) {
          console.log('End of file reached, closing stream');
          controller.close();
          fileStream.delete();
          byobRequest.respond(0);
          return;
        }

        // Calculate how many bytes we can read
        const bytesToRead = Math.min(view.byteLength, fileSize - position);

        // Seek to the current position (in case the stream was used elsewhere)
        await fileStream.seek(position);

        // Read data into the provided buffer
        await fileStream.read(bytesToRead, (data: Uint8Array) => {
          // Copy the data to the view
          new Uint8Array(view.buffer).set(data, view.byteOffset);

          // Update position
          position += data.length;

          // Respond with how many bytes were read
          byobRequest.respond(data.length);

          console.log(`Transferred ${data.length} bytes. Position: ${position}/${fileSize}`);

          // If we couldn't read as many bytes as requested, we've reached EOF
          if (data.length < bytesToRead) {
            console.log('Reached end of file (partial read)');
            controller.close();
            fileStream.delete();
          }
        });
      } catch (error) {
        console.error('Error reading from file:', error);
        controller.error(error);
      }
    },

    cancel(reason) {
      console.log(`Stream cancelled: ${reason}`);
      fileStream.delete();
      // No explicit close needed as the shared_ptr will handle cleanup
    },
  });
}
// Properly typed readAll function
async function readAll(file: WfsFile): Promise<Uint8Array> {
  // Create the readable stream
  const readableStream = await createReadableByteStream(file);

  // Get a reader with explicit typing
  const reader = readableStream.getReader({ mode: 'byob' }) as ReadableStreamBYOBReader;

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  try {
    while (true) {
      // Create a buffer for each chunk
      const buffer = new ArrayBuffer(32768); // 32KB buffer
      const view = new Uint8Array(buffer);

      // Read into the buffer
      const result = await reader.read(view);

      if (result.done) break;

      // The returned value is a Uint8Array view with proper length
      const chunk = result.value;
      chunks.push(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
      totalSize += chunk.byteLength;
    }
  } finally {
    // Always release the reader lock
    reader.releaseLock();
  }

  // Create the final array with the exact size needed
  const data = new Uint8Array(totalSize);
  let offset = 0;

  // Copy all chunks into the final array
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return data;
}
// Function to load file content
async function loadFileContent(filePath: string): Promise<void> {
  return wfsQueue.execute(async () => {
    const fileViewer = document.getElementById('fileViewer');
    if (!fileViewer) return;

    fileViewer.innerHTML = '<div class="loading">Loading file content...</div>';

    try {
      const file = await wfsDevice.getFile(filePath);
      const fileSize = await file.getSize();

      // Display file info
      const fileInfo = document.createElement('div');
      fileInfo.innerHTML = `
      <strong>File:</strong> ${filePath}<br>
      <strong>Size:</strong> ${formatSize(fileSize)}<br>
      <strong>Size on Disk:</strong> ${formatSize(await file.getSizeOnDisk())}
    `;
      fileViewer.innerHTML = '';
      fileViewer.appendChild(fileInfo);

      // Create content container
      const contentContainer = document.createElement('div');
      contentContainer.className = 'pre-wrap';
      contentContainer.style.marginTop = '10px';
      fileViewer.appendChild(contentContainer);

      // Check file size before loading content
      if (fileSize > 10 * 1024 * 1024) {
        // 10MB limit
        contentContainer.innerHTML =
          '<div class="info">File is too large to display in browser. Use the Save button to save it.</div>';
        return;
      }

      // Read file content
      const data = await readAll(file);

      // Detect if file is binary or text
      const isBinary = detectBinaryData(data);

      if (isBinary || hexView) {
        // Show hex view if binary or hex view is enabled
        contentContainer.innerHTML = formatHexDump(data);
      } else if (textView) {
        // Try to show as text if text view is enabled
        try {
          const textDecoder = new TextDecoder('utf-8');
          const text = textDecoder.decode(data);
          contentContainer.textContent = text;
        } catch (err) {
          contentContainer.innerHTML = formatHexDump(data);
        }
      } else {
        // If neither hex view nor text view is enabled, show a placeholder
        contentContainer.innerHTML =
          '<div class="info">Select a view mode using the buttons below.</div>';
      }
    } catch (err) {
      if (err instanceof wfsModule.WfsException) {
        fileViewer.innerHTML = `<div class="error">Failed to load file: ${wfsModule.wfsErrorToString(
          err.error(),
        )}</div>`;
      } else {
        fileViewer.innerHTML = `<div class="error">Failed to load file: ${err}</div>`;
      }
    }
  });
}

// Download/save selected file
async function downloadSelectedFile(): Promise<void> {
  return wfsQueue.execute(async () => {
    if (!selectedFile) {
      log('No file selected', 'error');
      return;
    }

    try {
      const file = await wfsDevice.getFile(selectedFile.path);

      // Show save file picker
      const result: SaveResponse = await mySaveFileWithPicker(
        await readAll(file),
        selectedFile.name,
      );

      if (result.success) {
        log(`File saved successfully`, 'success');
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        if (err instanceof wfsModule.WfsException) {
          log(`Failed to save file: ${wfsModule.wfsErrorToString(err.error())}`, 'error');
        } else {
          log(`Failed to save file: ${err.message}`, 'error');
        }
      }
    }
  });
}

// Toggle hex view
async function toggleHexView(): Promise<void> {
  hexView = !hexView;
  if (hexView) {
    textView = false;
  }

  if (selectedFile) {
    await loadFileContent(selectedFile.path);
  }

  log(`Hex view ${hexView ? 'enabled' : 'disabled'}`, 'info');
}

// Toggle text view
async function toggleTextView(): Promise<void> {
  textView = !textView;
  if (textView) {
    hexView = false;
  }

  if (selectedFile) {
    await loadFileContent(selectedFile.path);
  }

  log(`Text view ${textView ? 'enabled' : 'disabled'}`, 'info');
}

// Extract current directory
async function handleExtractCurrentDirectory(): Promise<void> {
  return wfsQueue.execute(async () => {
    if (!outputDirectoryHandle) {
      log('Please select an output directory first', 'error');
      return;
    }

    if (!currentDirectory) {
      log('No directory to extract', 'error');
      return;
    }

    const recursiveCheckbox = document.getElementById('extractRecursive') as HTMLInputElement;
    const preserveStructureCheckbox = document.getElementById(
      'extractPreserveStructure',
    ) as HTMLInputElement;

    const recursive = recursiveCheckbox ? recursiveCheckbox.checked : true;
    const preserveStructure = preserveStructureCheckbox ? preserveStructureCheckbox.checked : true;

    showExtractionProgress(true);
    updateExtractionProgress(0, 'Scanning directory...');

    try {
      await extractDirectory(
        currentDirectory,
        currentPath,
        outputDirectoryHandle,
        recursive,
        preserveStructure,
      );

      updateExtractionProgress(100, 'Extraction completed');
      log('Directory extraction completed', 'success');
    } catch (err) {
      updateExtractionProgress(0, `Error: ${err}`);
      log(`Failed to extract directory: ${err}`, 'error');
    }
  });
}

// Extract selected file
async function handleExtractSelectedFile(): Promise<void> {
  if (!outputDirectoryHandle) {
    log('Please select an output directory first', 'error');
    return;
  }

  if (!selectedFile) {
    log('No file selected', 'error');
    return;
  }

  showExtractionProgress(true);
  updateExtractionProgress(0, `Preparing to extract ${selectedFile.name}...`);

  try {
    // Get the file
    const file = await wfsDevice.getFile(selectedFile.path);

    // Create a file in the output directory
    const outputFileHandle = await outputDirectoryHandle.getFileHandle(selectedFile.name, {
      create: true,
    });

    // Get file data and write to output
    updateExtractionProgress(50, `Writing ${selectedFile.name}...`);
    const fileData = await readAll(file);

    // Write data to file using File System Access API directly
    const writable = await outputFileHandle.createWritable();
    await writable.write(fileData);
    await writable.close();

    updateExtractionProgress(100, 'File extraction completed');
    log(`File extracted: ${selectedFile.name}`, 'success');
  } catch (err) {
    updateExtractionProgress(0, `Error: ${err}`);
    if (err instanceof wfsModule.WfsException) {
      log(`Failed to extract file: ${wfsModule.wfsErrorToString(err.error())}`, 'error');
    } else {
      log(`Failed to extract file: ${err}`, 'error');
    }
  }
}

// Extract a directory recursively
async function extractDirectory(
  directory: WfsDirectory,
  path: string,
  outputDirHandle: FileSystemDirectoryHandle,
  recursive: boolean,
  preserveStructure: boolean,
): Promise<void> {
  try {
    updateExtractionProgress(null, `Processing directory: ${path}`);

    // Get all entries in the directory
    const entryDetails = await directory.getEntryDetails();
    const entries = Object.keys(entryDetails);
    const totalEntries = entries.length;
    let processedEntries = 0;

    // Create subdirectory if preserving structure
    let targetDirHandle = outputDirHandle;
    if (preserveStructure && path !== '/') {
      const dirName = path.split('/').pop() || '';
      targetDirHandle = await outputDirHandle.getDirectoryHandle(dirName, { create: true });
    }

    // Process each entry
    for (const entryName of entries) {
      const entry = entryDetails[entryName];
      const entryPath = path === '/' ? `/${entryName}` : `${path}/${entryName}`;

      updateExtractionProgress(
        Math.floor((processedEntries / totalEntries) * 100),
        `Processing: ${entryPath}`,
      );

      if (entry.type === 'directory' && recursive) {
        // Process subdirectory recursively
        const subDir = await wfsDevice.getDirectory(entryPath);

        if (preserveStructure) {
          // Create subdirectory in output
          const subDirHandle = await targetDirHandle.getDirectoryHandle(entryName, {
            create: true,
          });
          await extractDirectory(subDir, entryPath, subDirHandle, recursive, false);
        } else {
          // Extract into output directory
          await extractDirectory(subDir, entryPath, targetDirHandle, recursive, preserveStructure);
        }
      } else if (entry.type === 'file') {
        // Extract file
        updateExtractionProgress(null, `Extracting file: ${entryPath}`);

        try {
          const file = await wfsDevice.getFile(entryPath);
          const outputFileHandle = await targetDirHandle.getFileHandle(entryName, { create: true });

          // Write data directly using File System Access API
          const writable = await outputFileHandle.createWritable();
          await writable.write(await readAll(file));
          await writable.close();

          updateExtractionDetails(`Extracted: ${entryPath}`);
        } catch (err) {
          updateExtractionDetails(`Error extracting ${entryPath}: ${err}`);
        }
      }

      processedEntries++;
    }

    updateExtractionProgress(100, `Completed directory: ${path}`);
  } catch (err) {
    throw new Error(`Failed to extract directory ${path}: ${err}`);
  }
}

// Show/hide extraction progress
function showExtractionProgress(show: boolean): void {
  const progressElement = document.getElementById('extractionProgress');
  if (progressElement) {
    progressElement.style.display = show ? 'block' : 'none';
  }

  if (show) {
    const detailsElement = document.getElementById('extractProgressDetails');
    if (detailsElement) {
      detailsElement.innerHTML = '';
    }
  }
}

// Update extraction progress
function updateExtractionProgress(percent: number | null, status: string): void {
  const progressBar = document.getElementById('extractProgressBar') as HTMLProgressElement;
  const progressStatus = document.getElementById('extractProgressStatus');

  if (percent !== null && progressBar) {
    progressBar.value = percent;
  }

  if (progressStatus) {
    progressStatus.textContent = status;
  }
}

// Add details to extraction progress
function updateExtractionDetails(detail: string): void {
  const detailsContainer = document.getElementById('extractProgressDetails');
  if (!detailsContainer) return;

  const detailElem = document.createElement('div');
  detailElem.textContent = detail;
  detailsContainer.appendChild(detailElem);
  detailsContainer.scrollTop = detailsContainer.scrollHeight;
}

// Format size in human-readable form
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Detect if data is binary
function detectBinaryData(data: Uint8Array): boolean {
  // Check a sample of the data for binary characters
  const sampleSize = Math.min(data.length, 1000);
  let binaryCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    const byte = data[i];
    if (byte < 9 || (byte > 13 && byte < 32) || byte > 126) {
      binaryCount++;
    }
  }

  // Consider binary if more than 10% is binary
  return binaryCount / sampleSize > 0.1;
}

// Format hex dump
function formatHexDump(data: Uint8Array): string {
  let result = '';
  const bytesPerLine = 16;

  for (let i = 0; i < data.length; i += bytesPerLine) {
    // Address
    result += `<span style="color:#888">${i.toString(16).padStart(8, '0')}</span>: `;

    // Hex values
    for (let j = 0; j < bytesPerLine; j++) {
      if (i + j < data.length) {
        result += `${data[i + j].toString(16).padStart(2, '0')} `;
      } else {
        result += '   ';
      }

      if (j === 7) {
        result += ' ';
      }
    }

    // ASCII representation
    result += ' |';
    for (let j = 0; j < bytesPerLine; j++) {
      if (i + j < data.length) {
        const byte = data[i + j];
        if (byte >= 32 && byte <= 126) {
          result += String.fromCharCode(byte);
        } else {
          result += '.';
        }
      } else {
        result += ' ';
      }
    }
    result += '|<br>';
  }

  return result;
}

// Log function for the log section
function log(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  const logSection = document.getElementById('logSection');
  if (!logSection) return;

  const logEntry = document.createElement('div');
  logEntry.className = type;
  logEntry.textContent = message;
  logSection.appendChild(logEntry);
  logSection.scrollTop = logSection.scrollHeight;
}

// Update progress bar
function updateProgress(percent: number, status: string): void {
  const progressBar = document.getElementById('progressBar') as HTMLProgressElement;
  const progressStatus = document.getElementById('progressStatus');

  if (progressBar) progressBar.value = percent;
  if (progressStatus) progressStatus.textContent = status;
}

// Initialize the module when the page loads
document.addEventListener('DOMContentLoaded', initModule);
import WfsLibModule from '../wasm/wfslib_web.js';
import type {
  WfsDevice,
  WfsException,
  WfsFile,
  WfsDirectory,
  VectorString,
  WfsError,
  WfsModuleType,
  Device,
} from 'WfsLibModule';
import {
  DirectoryPickerResponse,
  mySaveFileWithPicker,
  myShowDirectoryPicker,
  myShowOpenFilePicker,
  PickerResponse,
  SaveResponse,
} from './fs-access-client';

// Import CSS styles
import './styles.css';
import { JSFileDevice } from './js-file-device';
import { wfsQueue } from './wfs-async-queue';

interface SelectedFile {
  path: string;
  name: string;
  size: number;
}

// State
let wfsModule: WfsModuleType;
let wfsDevice: WfsDevice;
let currentPath = '/';
let currentDirectory: WfsDirectory | null = null;
let selectedFile: SelectedFile | null = null;
let hexView = false;
let textView = true;

// File handles
let wfsFileHandle: FileSystemFileHandle | null = null;
let otpFileHandle: FileSystemFileHandle | null = null;
let seepromFileHandle: FileSystemFileHandle | null = null;
let outputDirectoryHandle: FileSystemDirectoryHandle | null = null;

// Initialize the module
async function initModule(): Promise<void> {
  try {
    wfsModule = await WfsLibModule();
    log('WFS Library loaded successfully', 'success');

    // Enable the load button once the module is loaded
    const loadButton = document.getElementById('loadButton') as HTMLButtonElement;
    if (loadButton) {
      loadButton.disabled = false;
    }

    setupEventListeners();
  } catch (err) {
    log(`Failed to load WFS Library: ${err}`, 'error');
  }
}

// Set up event listeners
function setupEventListeners(): void {
  // File selection buttons
  const selectWfsFile = document.getElementById('selectWfsFile');
  const selectOtpFile = document.getElementById('selectOtpFile');
  const selectOtpFileUsb = document.getElementById('selectOtpFileUsb');
  const selectSeepromFile = document.getElementById('selectSeepromFile');

  if (selectWfsFile) selectWfsFile.addEventListener('click', handleSelectWfsFile);
  if (selectOtpFile) selectOtpFile.addEventListener('click', handleSelectOtpFile);
  if (selectOtpFileUsb) selectOtpFileUsb.addEventListener('click', handleSelectOtpFileUsb);
  if (selectSeepromFile) selectSeepromFile.addEventListener('click', handleSelectSeepromFile);

  // Load button
  const loadButton = document.getElementById('loadButton');
  if (loadButton) loadButton.addEventListener('click', loadWfsImage);

  // Encryption type selector
  const encryptionType = document.getElementById('encryptionType');
  if (encryptionType) encryptionType.addEventListener('change', handleEncryptionTypeChange);

  // File action buttons
  const downloadButton = document.getElementById('downloadButton');
  const hexViewButton = document.getElementById('hexViewButton');
  const textViewButton = document.getElementById('textViewButton');

  if (downloadButton) downloadButton.addEventListener('click', downloadSelectedFile);
  if (hexViewButton) hexViewButton.addEventListener('click', toggleHexView);
  if (textViewButton) textViewButton.addEventListener('click', toggleTextView);

  // Tab navigation
  const browserTab = document.getElementById('browserTab');
  const extractTab = document.getElementById('extractTab');
  const infoTab = document.getElementById('infoTab');

  if (browserTab) browserTab.addEventListener('click', () => switchTab('browser'));
  if (extractTab) extractTab.addEventListener('click', () => switchTab('extract'));
  if (infoTab) infoTab.addEventListener('click', () => switchTab('info'));

  // Extraction
  const selectExtractionPath = document.getElementById('selectExtractionPath');
  const extractCurrentDir = document.getElementById('extractCurrentDir');
  const extractSelectedFile = document.getElementById('extractSelectedFile');

  if (selectExtractionPath)
    selectExtractionPath.addEventListener('click', handleSelectExtractionPath);
  if (extractCurrentDir) extractCurrentDir.addEventListener('click', handleExtractCurrentDirectory);
  if (extractSelectedFile) extractSelectedFile.addEventListener('click', handleExtractSelectedFile);
}

// Handle WFS file selection
async function handleSelectWfsFile(): Promise<void> {
  try {
    const result: PickerResponse = await myShowOpenFilePicker({
      types: [
        {
          description: 'WFS Image Files',
          accept: {
            'application/octet-stream': ['.wfs', '.img', '.bin'],
          },
        },
      ],
    });

    if (!result.success || !result.handles || result.handles.length === 0) {
      return; // User cancelled
    }

    const handle = result.handles[0];
    const file = await handle.getFile();
    wfsFileHandle = handle;

    const selectedWfsFile = document.getElementById('selectedWfsFile');
    if (selectedWfsFile) {
      selectedWfsFile.textContent = `${file.name} (${formatSize(file.size)})`;
    }

    updateLoadButtonState();
    log(`Selected WFS image: ${file.name} (${formatSize(file.size)})`, 'info');
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      log(`Error selecting WFS file: ${err.message}`, 'error');
    }
  }
}

// Handle OTP file selection for MLC
async function handleSelectOtpFile(): Promise<void> {
  try {
    const result: PickerResponse = await myShowOpenFilePicker({
      types: [
        {
          description: 'OTP Files',
          accept: {
            'application/octet-stream': ['.bin'],
          },
        },
      ],
    });

    if (!result.success || !result.handles || result.handles.length === 0) {
      return; // User cancelled
    }

    const handle = result.handles[0];
    const file = await handle.getFile();
    otpFileHandle = handle;

    const selectedOtpFile = document.getElementById('selectedOtpFile');
    if (selectedOtpFile) {
      selectedOtpFile.textContent = `${file.name} (${formatSize(file.size)})`;
    }

    updateLoadButtonState();
    log(`Selected OTP file: ${file.name} (${formatSize(file.size)})`, 'info');
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      log(`Error selecting OTP file: ${err.message}`, 'error');
    }
  }
}

// Handle OTP file selection for USB
async function handleSelectOtpFileUsb(): Promise<void> {
  try {
    const result: PickerResponse = await myShowOpenFilePicker({
      types: [
        {
          description: 'OTP Files',
          accept: {
            'application/octet-stream': ['.bin'],
          },
        },
      ],
    });

    if (!result.success || !result.handles || result.handles.length === 0) {
      return; // User cancelled
    }

    const handle = result.handles[0];
    const file = await handle.getFile();
    otpFileHandle = handle;

    const selectedOtpFileUsb = document.getElementById('selectedOtpFileUsb');
    if (selectedOtpFileUsb) {
      selectedOtpFileUsb.textContent = `${file.name} (${formatSize(file.size)})`;
    }

    updateLoadButtonState();
    log(`Selected OTP file: ${file.name} (${formatSize(file.size)})`, 'info');
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      log(`Error selecting OTP file: ${err.message}`, 'error');
    }
  }
}

// Handle SEEPROM file selection
async function handleSelectSeepromFile(): Promise<void> {
  try {
    const result: PickerResponse = await myShowOpenFilePicker({
      types: [
        {
          description: 'SEEPROM Files',
          accept: {
            'application/octet-stream': ['.bin'],
          },
        },
      ],
    });

    if (!result.success || !result.handles || result.handles.length === 0) {
      return; // User cancelled
    }

    const handle = result.handles[0];
    const file = await handle.getFile();
    seepromFileHandle = handle;

    const selectedSeepromFile = document.getElementById('selectedSeepromFile');
    if (selectedSeepromFile) {
      selectedSeepromFile.textContent = `${file.name} (${formatSize(file.size)})`;
    }

    updateLoadButtonState();
    log(`Selected SEEPROM file: ${file.name} (${formatSize(file.size)})`, 'info');
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      log(`Error selecting SEEPROM file: ${err.message}`, 'error');
    }
  }
}

// Handle extraction path selection
async function handleSelectExtractionPath(): Promise<void> {
  try {
    const result: DirectoryPickerResponse = await myShowDirectoryPicker();

    if (!result.success || !result.dirHandle) {
      return; // User cancelled
    }

    const handle = result.dirHandle;
    outputDirectoryHandle = handle;

    const selectedExtractionPath = document.getElementById('selectedExtractionPath');
    if (selectedExtractionPath) {
      selectedExtractionPath.textContent = handle.name;
    }

    log(`Selected output directory: ${handle.name}`, 'info');
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      log(`Error selecting output directory: ${err.message}`, 'error');
    }
  }
}

// Handle encryption type change
function handleEncryptionTypeChange(): void {
  const select = document.getElementById('encryptionType') as HTMLSelectElement;
  const type = select ? select.value : 'plain';

  const mlcKeySection = document.getElementById('mlcKeySection');
  const usbKeySection = document.getElementById('usbKeySection');

  if (mlcKeySection) {
    mlcKeySection.style.display = type === 'mlc' ? 'block' : 'none';
  }

  if (usbKeySection) {
    usbKeySection.style.display = type === 'usb' ? 'block' : 'none';
  }

  updateLoadButtonState();
}

// Update the load button state based on selected files
function updateLoadButtonState(): void {
  const loadButton = document.getElementById('loadButton') as HTMLButtonElement;
  if (!loadButton) return;

  const wfsSelected = wfsFileHandle !== null;
  const encryptionTypeSelect = document.getElementById('encryptionType') as HTMLSelectElement;
  const encryptionType = encryptionTypeSelect ? encryptionTypeSelect.value : 'plain';

  let enabled = wfsSelected;

  if (encryptionType === 'mlc') {
    enabled = enabled && otpFileHandle !== null;
  } else if (encryptionType === 'usb') {
    enabled = enabled && otpFileHandle !== null && seepromFileHandle !== null;
  }

  loadButton.disabled = !enabled;
}

let jsDevice: Device;

// Load WFS image
async function loadWfsImage(): Promise<void> {
  return wfsQueue.execute(async () => {
    if (!wfsFileHandle) {
      log('Please select a WFS image file', 'error');
      return;
    }

    const encryptionTypeSelect = document.getElementById('encryptionType') as HTMLSelectElement;
    const encryptionType = encryptionTypeSelect ? encryptionTypeSelect.value : 'plain';
    let key: Uint8Array = new Uint8Array();

    try {
      const progressSection = document.getElementById('progressSection');
      if (progressSection) {
        progressSection.style.display = 'block';
      }

      updateProgress(10, 'Preparing to load image...');

      // Handle encryption if needed
      if (encryptionType === 'mlc') {
        if (!otpFileHandle) {
          log('Please select an OTP file for MLC encryption', 'error');
          if (progressSection) {
            progressSection.style.display = 'none';
          }
          return;
        }

        updateProgress(20, 'Reading OTP file...');
        const otpFile = await otpFileHandle.getFile();
        const otpData = new Uint8Array(await otpFile.arrayBuffer());

        updateProgress(30, 'Generating MLC key...');
        try {
          key = wfsModule.getMLCKeyFromOTP(otpData);
          updateProgress(40, 'MLC key generated');
        } catch (err: unknown) {
          if (err instanceof wfsModule.WfsException) {
            log(`Failed to generate MLC key: ${wfsModule.wfsErrorToString(err.error())}`, 'error');
          } else {
            log(
              `Failed to generate MLC key: ${err instanceof Error ? err.message : String(err)}`,
              'error',
            );
          }
          if (progressSection) {
            progressSection.style.display = 'none';
          }
          return;
        }
      } else if (encryptionType === 'usb') {
        if (!otpFileHandle || !seepromFileHandle) {
          log('Please select both OTP and SEEPROM files for USB encryption', 'error');
          if (progressSection) {
            progressSection.style.display = 'none';
          }
          return;
        }

        updateProgress(20, 'Reading OTP and SEEPROM files...');
        const otpFile = await otpFileHandle.getFile();
        const seepromFile = await seepromFileHandle.getFile();

        const otpData = new Uint8Array(await otpFile.arrayBuffer());
        const seepromData = new Uint8Array(await seepromFile.arrayBuffer());

        updateProgress(30, 'Generating USB key...');
        try {
          key = wfsModule.getUSBKey(otpData, seepromData);
          updateProgress(40, 'USB key generated');
        } catch (err: unknown) {
          if (err instanceof wfsModule.WfsException) {
            log(`Failed to generate USB key: ${wfsModule.wfsErrorToString(err.error())}`, 'error');
          } else {
            log(
              `Failed to generate USB key: ${err instanceof Error ? err.message : String(err)}`,
              'error',
            );
          }
          if (progressSection) {
            progressSection.style.display = 'none';
          }
          return;
        }
      }

      // Open the WFS device using the file handle
      updateProgress(50, 'Opening WFS image...');
      try {
        updateProgress(60, 'Detecting WFS parameters...');

        // Create JSFileDevice directly using the file handle
        jsDevice = wfsModule.Device.implement(new JSFileDevice(wfsFileHandle, 9, true));

        // Then create WfsDevice with the JSFileDevice
        wfsDevice = await wfsModule.WfsDevice.Open(jsDevice, key);
        updateProgress(70, 'WFS image opened successfully');
        log('WFS image loaded successfully', 'success');
      } catch (err: unknown) {
        if (err instanceof wfsModule.WfsException) {
          log(`Failed to open WFS image: ${wfsModule.wfsErrorToString(err.error())}`, 'error');
        } else {
          log(
            `Failed to open WFS image: ${err instanceof Error ? err.message : String(err)}`,
            'error',
          );
        }
        if (progressSection) {
          progressSection.style.display = 'none';
        }
        return;
      }

      // Load root directory
      updateProgress(80, 'Loading root directory...');
      try {
        const rootDir = await wfsDevice.getRootDirectory();
        updateProgress(90, 'Reading directory structure...');

        // Show browser section
        const browserSection = document.getElementById('browserSection');
        if (browserSection) {
          browserSection.style.display = 'block';
        }

        // Load directory tree
        await loadDirectoryTree(rootDir, '/');
        updateProgress(100, 'Ready');

        // Switch to browser tab
        switchTab('browser');
      } catch (err: unknown) {
        if (err instanceof wfsModule.WfsException) {
          log(`Failed to load root directory: ${wfsModule.wfsErrorToString(err.error())}`, 'error');
        } else {
          log(
            `Failed to load root directory: ${err instanceof Error ? err.message : String(err)}`,
            'error',
          );
        }
        if (progressSection) {
          progressSection.style.display = 'none';
        }
      }
    } catch (err: unknown) {
      log(`Failed to load WFS image: ${err instanceof Error ? err.message : String(err)}`, 'error');
      const progressSection = document.getElementById('progressSection');
      if (progressSection) {
        progressSection.style.display = 'none';
      }
    }
  });
}

// Switch between tabs
function switchTab(tabName: string): void {
  // Hide all tab contents
  const browserTabContent = document.getElementById('browserTabContent');
  const extractTabContent = document.getElementById('extractTabContent');
  const infoTabContent = document.getElementById('infoTabContent');

  if (browserTabContent) browserTabContent.style.display = 'none';
  if (extractTabContent) extractTabContent.style.display = 'none';
  if (infoTabContent) infoTabContent.style.display = 'none';

  // Deactivate all tabs
  const browserTab = document.getElementById('browserTab');
  const extractTab = document.getElementById('extractTab');
  const infoTab = document.getElementById('infoTab');

  if (browserTab) browserTab.classList.remove('active');
  if (extractTab) extractTab.classList.remove('active');
  if (infoTab) infoTab.classList.remove('active');

  // Show selected tab content and activate tab
  const selectedTabContent = document.getElementById(`${tabName}TabContent`);
  const selectedTab = document.getElementById(`${tabName}Tab`);

  if (selectedTabContent) selectedTabContent.style.display = 'block';
  if (selectedTab) selectedTab.classList.add('active');

  // If switching to info tab, load WFS info
  if (tabName === 'info' && wfsDevice) {
    loadWfsInfo();
  }
}

// Load WFS information
function loadWfsInfo(): void {
  const infoContent = document.getElementById('wfsInfoContent');
  if (!infoContent) return;

  try {
    const fileSize = wfsFileHandle ? (wfsFileHandle as { size?: number })['size'] || 0 : 0;

    // This is a placeholder - in a real implementation, you would extract
    // information about the WFS image from the device
    const info = [
      `File: ${wfsFileHandle ? wfsFileHandle.name : 'Unknown'}`,
      `Encryption: ${
        (document.getElementById('encryptionType') as HTMLSelectElement)?.value || 'Unknown'
      }`,
      `Total Size: ${formatSize(fileSize)}`,
    ];

    infoContent.innerHTML = info.join('<br>');
  } catch (err) {
    infoContent.innerHTML = `Error loading WFS information: ${err}`;
  }
}

async function loadDirectoryTreeTask(directory: WfsDirectory, path: string): Promise<void> {
  return wfsQueue.execute(async () => await loadDirectoryTree(directory, path));
}

// Function to load directory tree
async function loadDirectoryTree(directory: WfsDirectory, path: string): Promise<void> {
  currentDirectory = directory;
  currentPath = path;

  // Update path in status bar
  const currentPathElement = document.getElementById('currentPath');
  const selectionInfoElement = document.getElementById('selectionInfo');

  if (currentPathElement) currentPathElement.textContent = path;
  if (selectionInfoElement) selectionInfoElement.textContent = '';

  const directoryTree = document.getElementById('directoryTree');
  if (!directoryTree) return;

  directoryTree.innerHTML = '';

  // Add parent directory if not at root
  if (path !== '/') {
    const parentItem = document.createElement('div');
    parentItem.className = 'directory-item folder';
    parentItem.textContent = '.. (Parent Directory)';
    parentItem.addEventListener('click', async () => {
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      const parentDir = parentPath === '' ? '/' : parentPath;

      try {
        const directory = await wfsDevice.getDirectory(parentDir);
        await loadDirectoryTree(directory, parentDir);
      } catch (err) {
        if (err instanceof wfsModule.WfsException) {
          log(`Failed to navigate to parent: ${wfsModule.wfsErrorToString(err.error())}`, 'error');
        } else {
          log(`Failed to navigate to parent: ${err}`, 'error');
        }
      }
    });
    directoryTree.appendChild(parentItem);
  }

  // Get directory entries and details
  try {
    const entryDetails = await directory.getEntryDetails();
    const entries = Object.keys(entryDetails);

    // Sort entries (directories first, then files)
    entries.sort((a, b) => {
      const aIsDir = entryDetails[a].type === 'directory';
      const bIsDir = entryDetails[b].type === 'directory';

      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    // Add entries to the tree
    for (const entryName of entries) {
      const entry = entryDetails[entryName];
      const entryPath = path === '/' ? `/${entryName}` : `${path}/${entryName}`;

      const item = document.createElement('div');
      item.className = 'directory-item';

      if (entry.type === 'directory') {
        item.className += ' folder';
        item.textContent = `📁 ${entryName}`;

        item.addEventListener('click', async () => {
          try {
            const subDir = await wfsDevice.getDirectory(entryPath);
            await loadDirectoryTreeTask(subDir, entryPath);
          } catch (err) {
            if (err instanceof wfsModule.WfsException) {
              log(`Failed to open directory: ${wfsModule.wfsErrorToString(err.error())}`, 'error');
            } else {
              log(`Failed to open directory: ${err}`, 'error');
            }
          }
        });
      } else if (entry.type === 'file') {
        item.className += ' file';
        item.textContent = `📄 ${entryName} (${formatSize(entry.size || 0)})`;

        item.addEventListener('click', () => {
          try {
            selectedFile = {
              path: entryPath,
              name: entryName,
              size: entry.size || 0,
            };

            // Highlight selected file
            const allItems = document.querySelectorAll('.directory-item');
            allItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');

            // Show file actions
            const fileActions = document.getElementById('fileActions');
            if (fileActions) {
              fileActions.style.display = 'block';
            }

            // Update status bar
            const selectionInfo = document.getElementById('selectionInfo');
            if (selectionInfo) {
              selectionInfo.textContent = `Selected: ${entryName} (${formatSize(entry.size || 0)})`;
            }

            // Load file content
            loadFileContent(entryPath);
          } catch (err) {
            if (err instanceof wfsModule.WfsException) {
              log(`Failed to select file: ${wfsModule.wfsErrorToString(err.error())}`, 'error');
            } else {
              log(`Failed to select file: ${err}`, 'error');
            }
          }
        });
      } else if (entry.type === 'link') {
        item.className += ' file';
        item.textContent = `🔗 ${entryName} (Link)`;
      } else {
        item.textContent = `❓ ${entryName} (Unknown)`;
      }

      directoryTree.appendChild(item);
    }

    // Update path display
    log(`Navigated to: ${path}`, 'info');

    // Clear file viewer when changing directories
    const fileViewer = document.getElementById('fileViewer');
    const fileActions = document.getElementById('fileActions');

    if (fileViewer) {
      fileViewer.innerHTML = '<div class="loading">Select a file to view its contents</div>';
    }

    if (fileActions) {
      fileActions.style.display = 'none';
    }

    selectedFile = null;
  } catch (err) {
    if (err instanceof wfsModule.WfsException) {
      log(`Failed to list directory entries: ${wfsModule.wfsErrorToString(err.error())}`, 'error');
    } else {
      log(`Failed to list directory entries: ${err}`, 'error');
    }

    if (directoryTree) {
      directoryTree.innerHTML = '<div class="error">Error loading directory</div>';
    }
  }
}
