cmake_minimum_required(VERSION 3.14)
project(wfs-tools-web VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Check if submodules are initialized
if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/submodules/wfslib/CMakeLists.txt")
  message(FATAL_ERROR "The wfslib submodule was not found. Please run:\n"
                      "git submodule update --init --recursive")
endif()

# Pass Emscripten optimization options
if(DEFINED EMSCRIPTEN_OPTIMIZATION_LEVEL)
  add_compile_options(${EMSCRIPTEN_OPTIMIZATION_LEVEL})
  add_link_options(${EMSCRIPTEN_OPTIMIZATION_LEVEL})
endif()

if(DEFINED EMSCRIPTEN_DEBUG_LEVEL)
  add_compile_options(-g${EMSCRIPTEN_DEBUG_LEVEL})
  add_link_options(-g${EMSCRIPTEN_DEBUG_LEVEL})
endif()

if(DEFINED EMSCRIPTEN_GENERATE_SOURCE_MAP AND EMSCRIPTEN_GENERATE_SOURCE_MAP)
  add_link_options(-gsource-map)
  add_link_options(--source-map-base ./)
endif()

# Add wfslib from submodule
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/submodules/wfslib" wfslib)

# Add web bindings
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/cpp" wfslib-web)