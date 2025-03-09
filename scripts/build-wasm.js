const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if Emscripten is available
function checkEmscriptenAvailable() {
  try {
    execSync('emcc --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error(
      'Emscripten not found in PATH. Please make sure you have activated Emscripten environment.',
    );
    console.error('You may need to run: source /path/to/emsdk/emsdk_env.sh');
    return false;
  }
}

// Verify submodules are initialized
function checkSubmodules() {
  const wfslibDir = path.resolve(__dirname, '../submodules/wfslib');
  const vcpkgDir = path.resolve(__dirname, '../submodules/vcpkg');

  if (!fs.existsSync(wfslibDir) || !fs.existsSync(path.join(wfslibDir, 'CMakeLists.txt'))) {
    console.error('wfslib submodule not found or not initialized');
    console.error('Please run: git submodule update --init --recursive');
    return false;
  }

  if (!fs.existsSync(vcpkgDir) || !fs.existsSync(path.join(vcpkgDir, 'bootstrap-vcpkg.sh'))) {
    console.error('vcpkg submodule not found or not initialized');
    console.error('Please run: git submodule update --init --recursive');
    return false;
  }

  return true;
}

// Create wasm output directory if it doesn't exist
function createWasmDir() {
  const wasmDir = path.resolve(__dirname, '../wasm');
  if (!fs.existsSync(wasmDir)) {
    fs.mkdirSync(wasmDir, { recursive: true });
  }
  return wasmDir;
}

// Determine build type from arguments
function getBuildType() {
  const args = process.argv.slice(2);
  const releaseIndex = args.indexOf('--release');
  const debugIndex = args.indexOf('--debug');

  if (releaseIndex !== -1) {
    return 'release';
  } else if (debugIndex !== -1) {
    return 'debug';
  }

  // Default to release
  return 'release';
}

// Run CMake configuration and build
function buildWasm(buildType) {
  const projectDir = path.resolve(__dirname, '..');
  const presetName = `wasm-${buildType}`;

  try {
    console.log(`Using CMake preset: ${presetName}`);

    // Configure CMake using the chosen preset
    console.log('Configuring CMake...');
    execSync(`cmake --preset=${presetName}`, {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env },
    });

    // Build with CMake
    console.log('Building WebAssembly module...');
    execSync(`cmake --build --preset=${presetName}`, {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env },
    });

    // Install to wasm directory
    console.log('Installing WebAssembly module to wasm directory...');
    execSync(`cmake --install build/${presetName}`, {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env },
    });

    return true;
  } catch (error) {
    console.error('Failed to build WebAssembly module:', error.message);
    return false;
  }
}

// Main build function
async function main() {
  const buildType = getBuildType();
  console.log(`Starting WebAssembly ${buildType} build...`);

  if (!checkEmscriptenAvailable()) {
    process.exit(1);
  }

  if (!checkSubmodules()) {
    process.exit(1);
  }

  // Create wasm directory
  createWasmDir();

  // Build the WASM module
  if (!buildWasm(buildType)) {
    process.exit(1);
  }

  console.log('WebAssembly module built successfully!');
  console.log('Output files are in the "wasm" directory.');
}

main().catch(error => {
  console.error('Build process failed:', error);
  process.exit(1);
});
