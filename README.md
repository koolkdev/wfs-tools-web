# WFS Tools Web

A modern web interface for exploring Wii U File System (WFS) images, built with TypeScript, WebAssembly, and CMake presets.

![🤖 100% AI Magic ✨ | 🙋 0% Human Suffering 🎉](https://img.shields.io/badge/🤖_100%25_AI_Magic_✨-🙋_0%25_Human_Suffering_🎉-ff69b4.svg)

## Features

- **Browser-Based WFS Explorer**: View and extract files directly in your web browser
- **Streaming Processing**: Uses File System Access API for efficient handling of large WFS images
- **Encryption Support**: Handles plain (unencrypted), MLC, and USB encrypted WFS images
- **Directory Navigation**: Browse WFS directory structure with an intuitive file explorer interface
- **File Extraction**: Extract individual files or entire directories to your local file system
- **Content Viewer**: View file contents with hex and text viewing options
- **WebAssembly Performance**: C++ core for maximum performance with TypeScript frontend
- **Modern Web Stack**: Built with TypeScript, Webpack, and npm
- **Dependency Management**: Uses Git submodules for wfslib, vcpkg, and Emscripten SDK

## Prerequisites

- Node.js (v14+)
- npm (v6+)
- Emscripten SDK (recent version)
- CMake (v3.23+)
- Git (for submodule management)

## Project Setup

### Clone and Initialize Submodules

```bash
# Clone the repository with submodules
git clone --recurse-submodules https://github.com/yourusername/wfs-tools-web.git
cd wfs-tools-web

# If you've already cloned without submodules, initialize them with:
git submodule update --init --recursive
```

### Install npm Dependencies

```bash
npm install
```

## Building

### Simple All-in-One Build (Recommended)

Build everything with a single command:

```bash
# Release build (optimized for production)
npm run build:all
```

That's it! This handles the Emscripten environment setup, WebAssembly compilation, and TypeScript frontend build.

### Advanced Build Options

If you need a debug build with source maps for development:

```bash
npm run build:all:debug
```

For more granular control, you can run individual build steps:

```bash
# Initialize Emscripten (first time only)
npm run setup:emscripten

# Build only the WebAssembly module
npm run build:wasm

# Build only the TypeScript frontend
npm run build
```

### 5. Running the Application

```bash
npm start
```

This will start a local HTTP server at http://localhost:9000 with the necessary headers for cross-origin isolation.

## Development

For development with hot-reloading:

```bash
npm run dev
```

Note that any changes to C++ code will require rebuilding the WebAssembly module:

```bash
npm run build:wasm && npm run dev
```

## Project Structure

```
wfs-tools-web/
├── submodules/           # Git submodules (wfslib, vcpkg, emsdk)
├── cpp/                  # C++ source files and bindings
├── src/                  # TypeScript source files
├── wasm/                 # WebAssembly output directory
├── custom-triplets/      # Custom vcpkg triplets
├── CMakeLists.txt        # Main CMake configuration
└── CMakePresets.json     # CMake presets configuration
```

## Using the Application

### Loading a WFS Image

1. Select a WFS image file using the "Select WFS Image" button
2. Choose the encryption type:
   - **Plain**: No encryption (default)
   - **MLC**: For MLC (internal storage) WFS images, requires an OTP file
   - **USB**: For USB (external storage) WFS images, requires OTP and SEEPROM files
3. If MLC or USB encryption is selected, provide the required key files
4. Click "Load WFS Image" to process and open the image

### Browsing Files

- Navigate the directory structure in the left panel
- Click on folders to navigate into them
- Click on files to view their contents in the right panel
- Use the parent directory link (..) to navigate up the directory structure

### Viewing Files

- Select a file to view its contents
- Use the "Toggle Hex View" button to switch to hexadecimal view
- Use the "Toggle Text View" button to switch to text view

### Extracting Files

1. Go to the "Extract" tab
2. Select an output directory using the "Select Output Directory" button
3. Configure extraction options:
   - **Extract directories recursively**: Extract subdirectories and their contents
   - **Preserve directory structure**: Maintain folder hierarchy in the output
4. Use "Extract Current Directory" to extract the currently viewed directory
5. Use "Extract Selected File" to extract only the currently selected file

## CMake Presets

This project uses CMake presets to simplify the build configuration:

- **wasm-debug**: Debug build with optimization level O0 and source maps
- **wasm-release**: Release build with optimization level O3

## Security and Permissions

This application uses the File System Access API which requires explicit user permission to access files. All file processing is done locally in your browser - no data is uploaded to any server.

## Browser Compatibility

The application requires a modern browser that supports:

- WebAssembly
- File System Access API
- Web Workers
- SharedArrayBuffer with cross-origin isolation

Recommended browsers:

- Chrome 89+
- Edge 89+
- Opera 75+
- Firefox 90+ (with some features enabled in about:config)

## License

MIT
