# WFS Tools Web

A web-based application for browsing Wii U File System (WFS) images. Built with React, TypeScript, and WebAssembly (via Emscripten), it allows you to view and manage WFS images directly in your browser.

**👉 [Try it live in your browser!](https://koolkdev.github.io/wfs-tools-web)**

![🤖 100% AI Magic ✨ | 🙋 0% Human Suffering 🎉](https://img.shields.io/badge/🤖_100%25_AI_Magic_✨-🙋_0%25_Human_Suffering_🎉-ff69b4.svg)

## Features

- **Web-based WFS Browser**: Browse and extract files from WFS images directly in the browser.
- **Efficient Streaming**: Uses the File System Access API for handling large images efficiently.
- **Supports Encrypted Images**: Compatible with plain (unencrypted), MLC, and USB encrypted WFS images.
- **Modern Web Stack**: Built using React, Vite, TypeScript, and WebAssembly.
- **Performance-oriented**: Core logic in C++ compiled to WebAssembly.
- **Dependency Management**: Includes `wfslib`, `vcpkg`, and `Emscripten` through Git submodules.

## Prerequisites

- Node.js (18.x+ recommended)
- Git

## Getting Started

### Clone the Repository

```bash
git clone --recurse-submodules https://github.com/yourusername/wfs-tools-web-react.git
cd wfs-tools-web-react

# Or if you cloned without submodules:
git submodule update --init --recursive
```

### Install Dependencies

```bash
npm install
```

## Building and Running

### Setup Emscripten

Required only on the first run:

```bash
npm run setup:emscripten
```

### Build WebAssembly Module

Release build (optimized):

```bash
npm run build:wasm
```

For debug builds (with source maps):

```bash
npm run build:wasm:debug
```

### Development Mode

To start the development server with hot-reloading:

```bash
npm run dev
```

_Note:_ If you modify the WebAssembly module (C++ code), rebuild it first:

```bash
npm run build:wasm && npm run dev
```

### Production Build

To build the application for production deployment:

```bash
npm run build
```

## Project Structure

```
wfs-tools-web-react/
├── src/                    # React/TypeScript application code
├── submodules/
│   ├── wfslib/             # WFS library
│   ├── vcpkg/              # Dependency manager
│   └── emsdk/              # Emscripten SDK
├── public/                 # Static assets
├── build/                  # Output directory
├── CMakeLists.txt          # CMake configuration
├── CMakePresets.json       # Build presets
└── package.json
```

## Usage

### Loading a WFS Image

1. Click **"Select WFS Image"** to choose a file.
2. Choose encryption type:
   - **Plain (unencrypted)**
   - **MLC (requires OTP file)**
   - **USB (requires OTP and SEEPROM files)**
3. Select required key files if applicable.
4. Click **"Load WFS Image"**.

### Browsing

- Navigate directories and files using the interface.
- Click directories to explore.
- Click files to preview contents.

### Extracting Files

- Use the **"Extract"** option to save files to your computer.
- Extraction supports recursive and structured output.

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Edge

_Note_: File System Access API is required; the application does not upload any files or data to a server.

## License

MIT
