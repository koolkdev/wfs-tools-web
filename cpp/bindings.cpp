#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <wfslib/wfslib.h>
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <queue>
#include <condition_variable>
#include <thread>
#include <future>

using namespace emscripten;

// Wrapper for Device interface to allow JavaScript implementation
struct DeviceWrapper : public wrapper<Device> {
    EMSCRIPTEN_WRAPPER(DeviceWrapper);
    
    void ReadSectors(const std::span<std::byte>& data, uint32_t sector_address, uint32_t sectors_count) override {
        // Call the JavaScript ReadSectors method
        call<val>("ReadSectors", val(typed_memory_view(data.size(), reinterpret_cast<const uint8_t*>(data.data()))), sector_address, sectors_count).await();    
    }
    
    void WriteSectors(const std::span<std::byte>& data, uint32_t sector_address, uint32_t sectors_count) override {
        // Call the JavaScript WriteSectors method
        call<val>("WriteSectors", val(typed_memory_view(data.size(), reinterpret_cast<const uint8_t*>(data.data()))), sector_address, sectors_count).await();
    }
    
    uint32_t SectorsCount() const override {
        return call<uint32_t>("SectorsCount");
    }
    
    uint32_t Log2SectorSize() const override {
        return call<uint32_t>("Log2SectorSize");
    }
    
    bool IsReadOnly() const override {
        return call<bool>("IsReadOnly");
    }
    
    void SetSectorsCount(uint32_t sectors_count) override {
        call<void>("SetSectorsCount", sectors_count);
    }
    
    void SetLog2SectorSize(uint32_t log2_sector_size) override {
        call<void>("SetLog2SectorSize", log2_sector_size);
    }
};

// Class to wrap a File for web use
class FileWrapper {
private:
    std::shared_ptr<File> file_;

public:
    FileWrapper(std::shared_ptr<File> file) : file_(file) {}

    uint32_t GetSize() const {
        return file_->Size();
    }

    uint32_t GetSizeOnDisk() const {
        return file_->SizeOnDisk();
    }

    std::shared_ptr<File::stream> GetStream() {
        return std::make_shared<File::stream>(file_);
    }
};

// Class to wrap a Directory for web use
class DirectoryWrapper {
private:
    std::shared_ptr<Directory> dir_;

public:
    DirectoryWrapper(std::shared_ptr<Directory> dir) : dir_(dir) {}

    size_t GetSize() const {
        return dir_->size();
    }

    std::vector<std::string> ListEntries() {
        std::vector<std::string> entries;
        for (auto it = dir_->begin(); it != dir_->end(); ++it) {
            auto [name, entry_or_error] = *it;
            entries.push_back(std::string(name));
        }
        return entries;
    }

    bool HasEntry(const std::string& name) {
        auto result = dir_->GetEntry(name);
        return result.has_value(); 
    }

    FileWrapper GetFile(const std::string& name) {
        auto result = dir_->GetFile(name);
        if (!result.has_value()) {
            throw WfsException(result.error());
        }
        return FileWrapper(*result);
    }

    DirectoryWrapper GetDirectory(const std::string& name) {
        auto result = dir_->GetDirectory(name);
        if (!result.has_value()) {
            throw WfsException(result.error());
        }
        return DirectoryWrapper(*result);
    }
    
    // Get entry details for all entries in the directory
    val GetEntryDetails() {
        val result = val::global("Object").new_();
        
        for (auto it = dir_->begin(); it != dir_->end(); ++it) {
            auto [name, entry_or_error] = *it;
            std::string name_str = std::string(name);
            auto entry = throw_if_error(entry_or_error);
            
            val entryInfo = val::global("Object").new_();
            entryInfo.set("name", name);
            
            if (entry->is_directory()) {
                entryInfo.set("type", "directory");
            } else if (entry->is_file()) {
                entryInfo.set("type", "file");
                auto file = std::dynamic_pointer_cast<File>(entry);
                entryInfo.set("size", file->Size());
                entryInfo.set("sizeOnDisk", file->SizeOnDisk());
            } else if (entry->is_link()) {
                entryInfo.set("type", "link");
            } else {
                entryInfo.set("type", "unknown");
            }
            
            result.set(name.c_str(), entryInfo);
        }
        
        return result;
    }
};

// Main wrapper for WfsDevice
class WfsDeviceWrapper {
private:
    std::shared_ptr<WfsDevice> device_;

public:
    WfsDeviceWrapper(std::shared_ptr<WfsDevice> device) : device_(device) {}

    // Static factory method that returns a shared pointer to WfsDeviceWrapper
    static std::shared_ptr<WfsDeviceWrapper> Open(std::shared_ptr<Device> device, const std::string& key = "") {
        try {
            // Convert key from string to std::byte vector
            std::optional<std::vector<std::byte>> keyOpt;
            if (!key.empty()) {
                std::vector<std::byte> keyBytes(key.size());
                std::transform(key.begin(), key.end(), keyBytes.begin(),
                              [](char b) { return static_cast<std::byte>(static_cast<uint8_t>(b)); });
                keyOpt = keyBytes;
            }

            // Detect device parameters
            auto error = Recovery::DetectDeviceParams(device, keyOpt);
            if (error.has_value()) {
                throw WfsException(error.value());
            }
            
            // Create WFS device using WfsDevice::Open
            auto wfsDeviceResult = WfsDevice::Open(device, keyOpt);
            if (!wfsDeviceResult.has_value()) {
                throw WfsException(wfsDeviceResult.error());
            }
            
            // Create and return the wrapper
            return std::make_shared<WfsDeviceWrapper>(*wfsDeviceResult);
        } catch (const WfsException& e) {
            throw;
        } catch (const std::exception& e) {
            throw WfsException(WfsError::kInvalidWfsVersion);
        }
    }

    DirectoryWrapper GetRootDirectory() {
        auto result = device_->GetRootDirectory();
        if (!result.has_value()) {
            throw WfsException(result.error());
        }
        return DirectoryWrapper(*result);
    }

    FileWrapper GetFile(const std::string& path) {
        auto file = device_->GetFile(path);
        if (!file) {
            throw WfsException(WfsError::kEntryNotFound);
        }
        return FileWrapper(file);
    }

    DirectoryWrapper GetDirectory(const std::string& path) {
        auto dir = device_->GetDirectory(path);
        if (!dir) {
            throw WfsException(WfsError::kEntryNotFound);
        }
        return DirectoryWrapper(dir);
    }

    bool HasEntry(const std::string& path) {
        return device_->GetEntry(path) != nullptr;
    }

    std::string GetEntryType(const std::string& path) {
        auto entry = device_->GetEntry(path);
        if (!entry) {
            return "not_found";
        }
        if (entry->is_file()) {
            return "file";
        }
        if (entry->is_directory()) {
            return "directory";
        }
        if (entry->is_link()) {
            return "link";
        }
        return "unknown";
    }
    
    // Flush any pending changes
    void Flush() {
        device_->Flush();
    }
};

// Function to create MLC key from OTP data
val GetMLCKeyFromOTP(const std::string& otpData) {
    std::vector<std::byte> data(otpData.size());
    std::transform(otpData.begin(), otpData.end(), data.begin(),
                  [](char b) { return static_cast<std::byte>(static_cast<uint8_t>(b)); });
    
    OTP otp(data);
    auto mlcKey = otp.GetMLCKey();
    
    val mlcKeyVal = val::global("Uint8Array").new_(mlcKey.size());
    for (size_t i = 0; i < mlcKey.size(); ++i) {
        mlcKeyVal.set(i, static_cast<uint8_t>(mlcKey[i]));
    }

    return mlcKeyVal;
}

// Function to create USB key from OTP and SEEPROM data
val GetUSBKey(const std::string& otpData, const std::string& seepromData) {
    std::vector<std::byte> otpBytes(otpData.size());
    std::transform(otpData.begin(), otpData.end(), otpBytes.begin(),
                  [](char b) { return static_cast<std::byte>(static_cast<uint8_t>(b)); });
    
    std::vector<std::byte> seepromBytes(seepromData.size());
    std::transform(seepromData.begin(), seepromData.end(), seepromBytes.begin(),
                  [](char b) { return static_cast<std::byte>(static_cast<uint8_t>(b)); });
    
    OTP otp(otpBytes);
    SEEPROM seeprom(seepromBytes);
    auto usbKey = seeprom.GetUSBKey(otp);
    
    val usbKeyVal = val::global("Uint8Array").new_(usbKey.size());
    for (size_t i = 0; i < usbKey.size(); ++i) {
        usbKeyVal.set(i, static_cast<uint8_t>(usbKey[i]));
    }

    return usbKeyVal;
}

// Error code to string conversion
std::string WfsErrorToString(WfsError error) {
    switch (error) {
        case WfsError::kEntryNotFound: return "Entry not found";
        case WfsError::kNotDirectory: return "Not a directory";
        case WfsError::kNotFile: return "Not a file";
        case WfsError::kBlockBadHash: return "Block has bad hash";
        case WfsError::kAreaHeaderCorrupted: return "Area header corrupted";
        case WfsError::kDirectoryCorrupted: return "Directory corrupted";
        case WfsError::kFreeBlocksAllocatorCorrupted: return "Free blocks allocator corrupted";
        case WfsError::kFileDataCorrupted: return "File data corrupted";
        case WfsError::kFileMetadataCorrupted: return "File metadata corrupted";
        case WfsError::kTransactionsAreaCorrupted: return "Transactions area corrupted";
        case WfsError::kInvalidWfsVersion: return "Invalid WFS version";
        case WfsError::kNoSpace: return "No space";
        default: return "Unknown error";
    }
}

EMSCRIPTEN_BINDINGS(wfslib) {
    // Register WfsError enum
    enum_<WfsError>("WfsError")
        .value("EntryNotFound", WfsError::kEntryNotFound)
        .value("NotDirectory", WfsError::kNotDirectory)
        .value("NotFile", WfsError::kNotFile)
        .value("BlockBadHash", WfsError::kBlockBadHash)
        .value("AreaHeaderCorrupted", WfsError::kAreaHeaderCorrupted)
        .value("DirectoryCorrupted", WfsError::kDirectoryCorrupted)
        .value("FreeBlocksAllocatorCorrupted", WfsError::kFreeBlocksAllocatorCorrupted)
        .value("FileDataCorrupted", WfsError::kFileDataCorrupted)
        .value("FileMetadataCorrupted", WfsError::kFileMetadataCorrupted)
        .value("TransactionsAreaCorrupted", WfsError::kTransactionsAreaCorrupted)
        .value("InvalidWfsVersion", WfsError::kInvalidWfsVersion)
        .value("NoSpace", WfsError::kNoSpace);

    // Register the exception class with raw pointer allowance
    class_<WfsException>("WfsException")
        .constructor<WfsError>()
        .function("what", select_overload<const char*() const>(&WfsException::what), allow_raw_pointer<ret_val>())
        .function("error", &WfsException::error);

    // Register File wrapper
    class_<FileWrapper>("File")
        .constructor<std::shared_ptr<File>>()
        .function("getSize", &FileWrapper::GetSize)
        .function("getSizeOnDisk", &FileWrapper::GetSizeOnDisk)
        .function("getStream", &FileWrapper::GetStream);

    // Register Directory wrapper
    class_<DirectoryWrapper>("Directory")
        .constructor<std::shared_ptr<Directory>>()
        .function("getSize", &DirectoryWrapper::GetSize)
        .function("listEntries", &DirectoryWrapper::ListEntries)
        .function("hasEntry", &DirectoryWrapper::HasEntry)
        .function("getFile", &DirectoryWrapper::GetFile)
        .function("getDirectory", &DirectoryWrapper::GetDirectory)
        .function("getEntryDetails", &DirectoryWrapper::GetEntryDetails);
        
    // Register Device abstract class
    class_<Device>("Device")
        .function("ReadSectors", &Device::ReadSectors, pure_virtual())
        .function("WriteSectors", &Device::WriteSectors, pure_virtual())
        .function("SectorsCount", &Device::SectorsCount, pure_virtual())
        .function("Log2SectorSize", &Device::Log2SectorSize, pure_virtual())
        .function("IsReadOnly", &Device::IsReadOnly, pure_virtual())
        .function("SetSectorsCount", &Device::SetSectorsCount, pure_virtual())
        .function("SetLog2SectorSize", &Device::SetLog2SectorSize, pure_virtual())
        .allow_subclass<DeviceWrapper, std::shared_ptr<DeviceWrapper>>("DeviceWrapper", "DeviceWrapperPtr")
        .smart_ptr<std::shared_ptr<Device>>("shared_ptr<Device>");

    // Register WfsDevice wrapper
    class_<WfsDeviceWrapper>("WfsDevice")
        .class_function("Open", &WfsDeviceWrapper::Open)
        .function("getRootDirectory", &WfsDeviceWrapper::GetRootDirectory)
        .function("getDirectory", &WfsDeviceWrapper::GetDirectory)
        .function("getFile", &WfsDeviceWrapper::GetFile)
        .function("hasEntry", &WfsDeviceWrapper::HasEntry)
        .function("getEntryType", &WfsDeviceWrapper::GetEntryType)
        .function("flush", &WfsDeviceWrapper::Flush)
        .smart_ptr<std::shared_ptr<WfsDeviceWrapper>>("shared_ptr<WfsDevice>");

    // Register File::stream class
    class_<File::stream>("FileStream")
        .smart_ptr<std::shared_ptr<File::stream>>("shared_ptr<FileStream>")
    .function("read", optional_override([](File::stream& self, uint32_t size, val callback) {
        std::vector<uint8_t> data(size);
        self.read(reinterpret_cast<char*>(data.data()), size);
        callback(typed_memory_view(data.size(), data.data()));
    }))
    .function("seek", optional_override([](File::stream& self, uint32_t pos) {
        self.seekg(pos);
    }))
       /* .function("read", optional_override([](File::stream& stream, char* buffer, std::streamsize size) {
           stream.read(buffer, size);
        }), allow_raw_pointer<arg<0>>())*/
        .function("position", &File::stream::tellg)
        .function("eof", &File::stream::eof);


    // Register helper functions
    function("getMLCKeyFromOTP", &GetMLCKeyFromOTP);
    function("getUSBKey", &GetUSBKey);
    function("wfsErrorToString", &WfsErrorToString);

    // Register vector types
    register_vector<uint8_t>("VectorUint8");
    register_vector<std::string>("VectorString");
}