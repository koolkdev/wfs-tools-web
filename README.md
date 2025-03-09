# WFS Tools Web

A modern web interface for exploring Wii U File System (WFS) images, built with TypeScript, WebAssembly, and CMake presets.

![🤖 100% AI Magic ✨ | 🙋 0% Human Suffering 🎉](https://img.shields.io/badge/🤖_100%25_AI_Magic_✨-🙋_0%25_Human_Suffering_🎉-ff69b4.svg)

## Features

- **Dependency Management**: Uses Git submodules for wfslib and vcpkg
- **Build Configuration**: CMake presets for debug and release builds
- **Modern Web Stack**: TypeScript, webpack, and npm for development
- **File System Access API**: Process WFS images efficiently with streaming

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

### 1. Set Up Emscripten

Make sure you have Emscripten SDK activated in your current shell:

```bash
# Activate Emscripten environment (adjust the path as needed)
source /path/to/emsdk/emsdk_env.sh
```

### 2. Build Options

#### Build Release Version (Default)

```bash
npm run build:wasm
# or explicitly:
npm run build:wasm:release
```

#### Build Debug Version

```bash
npm run build:wasm:debug
```

### 3. Build the TypeScript Frontend

```bash
npm run build
```

### 4. All-in-One Build

For convenience, you can run all build steps with a single command:

```bash
# Release build
npm run build:all

# Debug build
npm run build:all:debug
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
├── submodules/           # Git submodules
│   ├── wfslib/           # WFS library
│   └── vcpkg/            # Package manager
├── cpp/                  # C++ source files
│   ├── bindings.cpp      # Emscripten bindings
│   └── CMakeLists.txt    # CMake configuration for bindings
├── src/                  # TypeScript source files
├── wasm/                 # WebAssembly output directory
├── CMakeLists.txt        # Main CMake configuration
├── CMakePresets.json     # CMake presets configuration
└── .gitmodules           # Git submodules configuration
```

## CMake Presets

This project uses CMake presets to simplify the build configuration:

- **wasm-debug**: Debug build with optimization level O0 and source maps
- **wasm-release**: Release build with optimization level O3

## Using vcpkg

The project is configured to use vcpkg for managing C++ dependencies. To add a package:

1. First, bootstrap vcpkg if you haven't already:

   ```bash
   cd submodules/vcpkg
   ./bootstrap-vcpkg.sh  # or bootstrap-vcpkg.bat on Windows
   ```

2. Install the required package(s):

   ```bash
   ./vcpkg install package-name:wasm
   ```

3. Add the package to the CMakeLists.txt:
   ```cmake
   find_package(package-name CONFIG REQUIRED)
   target_link_libraries(wfslib-web PRIVATE package-name::package-name)
   ```

## Customizing the Build

Edit `CMakePresets.json` to customize build configurations such as optimization levels, debug information, and other Emscripten flags.
