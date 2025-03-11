project(wfslib-web VERSION 1.0.0 LANGUAGES CXX)

# Make sure wfslib is included before this project
if(NOT TARGET wfslib)
    message(FATAL_ERROR "wfslib target not found. Please include the wfslib project first.")
endif()

# Emscripten binding file
set(BINDING_SOURCE ${CMAKE_CURRENT_SOURCE_DIR}/bindings.cpp)

# Base Emscripten flags
set(EMSCRIPTEN_BASE_FLAGS
    -sWASM=1
    -sALLOW_MEMORY_GROWTH=1
    -sMAXIMUM_MEMORY=4GB
    -sMODULARIZE=1
    -sEXPORT_NAME=WfsLibModule
    -sEXPORTED_RUNTIME_METHODS=['addFunction']
    -sDISABLE_EXCEPTION_CATCHING=0
    -sEXPORT_ES6=1
    -sUSE_ES6_IMPORT_META=1
    -sUSE_PTHREADS=0
    -sPTHREAD_POOL_SIZE=4
    -sFILESYSTEM=0
    -sENVIRONMENT='web'
    -sASYNCIFY=1
    --bind
)

# Additional debug flags
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    list(APPEND EMSCRIPTEN_BASE_FLAGS
        -s ASSERTIONS=2
        -s STACK_OVERFLOW_CHECK=2
    )
endif()

# Convert list to string with spaces for target_link_options
string(REPLACE ";" " " EMSCRIPTEN_LINK_FLAGS "${EMSCRIPTEN_BASE_FLAGS}")

# Build the emscripten module
add_executable(${PROJECT_NAME} ${BINDING_SOURCE})

target_compile_features(${PROJECT_NAME} PRIVATE cxx_std_23)

# Get include directories from wfslib
get_property(wfs_include_dirs TARGET wfslib PROPERTY INCLUDE_DIRECTORIES)

# Add include directories
target_include_directories(${PROJECT_NAME}
    PRIVATE
        ${wfs_include_dirs}
)

# Link with wfslib
target_link_libraries(${PROJECT_NAME}
    PRIVATE
        wfslib
)

# Set link flags
set_target_properties(${PROJECT_NAME} PROPERTIES LINK_FLAGS "${EMSCRIPTEN_LINK_FLAGS}")

# Configure output name and directory
set_target_properties(${PROJECT_NAME} PROPERTIES
    OUTPUT_NAME "wfslib_web"
)

# Install the built files to the wasm directory
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION ${CMAKE_SOURCE_DIR}/src/assets/wasm
)

# Copy wasm and source map files to the wasm directory
install(FILES 
    $<TARGET_FILE_DIR:${PROJECT_NAME}>/wfslib_web.wasm
    $<$<BOOL:${EMSCRIPTEN_GENERATE_SOURCE_MAP}>:$<TARGET_FILE_DIR:${PROJECT_NAME}>/wfslib_web.wasm.map>
    DESTINATION ${CMAKE_SOURCE_DIR}/src/assets/wasm
)