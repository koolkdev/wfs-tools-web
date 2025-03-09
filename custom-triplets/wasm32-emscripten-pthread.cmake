# Include the base wasm32-emscripten triplet
include("${VCPKG_ROOT_DIR}/triplets/community/wasm32-emscripten.cmake")

# Set Emscripten flags for all packages
set(ENV{EMCC_CFLAGS} "$ENV{EMCC_CFLAGS} -pthread")