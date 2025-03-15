#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <memory>
#include <string>
#include <vector>
#include <wfslib/wfslib.h>

using namespace emscripten;

// Wrapper for Device interface to allow JavaScript implementation
struct DeviceWrapper : public wrapper<Device> {
  EMSCRIPTEN_WRAPPER(DeviceWrapper);

  void ReadSectors(const std::span<std::byte> &data, uint32_t sector_address,
                   uint32_t sectors_count) override {
    call<val>("ReadSectors",
              val(typed_memory_view(
                  data.size(), reinterpret_cast<const uint8_t *>(data.data()))),
              sector_address, sectors_count)
        .await();
  }

  void WriteSectors(const std::span<std::byte> &data, uint32_t sector_address,
                    uint32_t sectors_count) override {
    call<val>("WriteSectors",
              val(typed_memory_view(
                  data.size(), reinterpret_cast<const uint8_t *>(data.data()))),
              sector_address, sectors_count)
        .await();
  }

  uint32_t SectorsCount() const override {
    return call<uint32_t>("SectorsCount");
  }

  uint32_t Log2SectorSize() const override {
    return call<uint32_t>("Log2SectorSize");
  }

  bool IsReadOnly() const override { return call<bool>("IsReadOnly"); }

  void SetSectorsCount(uint32_t sectors_count) override {
    call<void>("SetSectorsCount", sectors_count);
  }

  void SetLog2SectorSize(uint32_t log2_sector_size) override {
    call<void>("SetLog2SectorSize", log2_sector_size);
  }
};

std::shared_ptr<WfsDevice> OpenWfsDevice(std::shared_ptr<Device> device,
                                         const std::string &key = "") {
  try {
    // Convert key from string to std::byte vector
    std::optional<std::vector<std::byte>> keyOpt;
    if (!key.empty()) {
      std::vector<std::byte> keyBytes(key.size());
      std::transform(key.begin(), key.end(), keyBytes.begin(), [](char b) {
        return static_cast<std::byte>(static_cast<uint8_t>(b));
      });
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
    return *wfsDeviceResult;
  } catch (const WfsException &e) {
    throw;
  } catch (const std::exception &e) {
    throw WfsException(WfsError::kInvalidWfsVersion);
  }
}

// Function to create MLC key from OTP data
std::vector<uint8_t> GetMLCKeyFromOTP(const std::string &otpData) {
  std::span<const std::byte> optBytes(
      reinterpret_cast<const std::byte *>(otpData.data()), otpData.size());
  auto key = OTP(optBytes).GetMLCKey();
  return std::vector<uint8_t>(reinterpret_cast<const uint8_t *>(key.data()),
                              reinterpret_cast<const uint8_t *>(key.data()) +
                                  key.size());
}

// Function to create USB key from OTP and SEEPROM data
std::vector<uint8_t> GetUSBKey(const std::string &otpData,
                               const std::string &seepromData) {
  std::span<const std::byte> optBytes(
      reinterpret_cast<const std::byte *>(otpData.data()), otpData.size());
  std::span<const std::byte> seepromBytes(
      reinterpret_cast<const std::byte *>(seepromData.data()),
      seepromData.size());
  auto key = SEEPROM(seepromBytes).GetUSBKey(OTP(optBytes));
  return std::vector<uint8_t>(reinterpret_cast<const uint8_t *>(key.data()),
                              reinterpret_cast<const uint8_t *>(key.data()) +
                                  key.size());
}

enum class EntryType { File, Directory, Link };

EMSCRIPTEN_BINDINGS(wfslib) {
  // Register WfsError enum
  enum_<WfsError>("WfsError")
      .value("EntryNotFound", WfsError::kEntryNotFound)
      .value("NotDirectory", WfsError::kNotDirectory)
      .value("NotFile", WfsError::kNotFile)
      .value("BlockBadHash", WfsError::kBlockBadHash)
      .value("AreaHeaderCorrupted", WfsError::kAreaHeaderCorrupted)
      .value("DirectoryCorrupted", WfsError::kDirectoryCorrupted)
      .value("FreeBlocksAllocatorCorrupted",
             WfsError::kFreeBlocksAllocatorCorrupted)
      .value("FileDataCorrupted", WfsError::kFileDataCorrupted)
      .value("FileMetadataCorrupted", WfsError::kFileMetadataCorrupted)
      .value("TransactionsAreaCorrupted", WfsError::kTransactionsAreaCorrupted)
      .value("InvalidWfsVersion", WfsError::kInvalidWfsVersion)
      .value("NoSpace", WfsError::kNoSpace);

  // Register the exception class with raw pointer allowance
  class_<WfsException>("WfsException")
      .constructor<WfsError>()
      .function("what",
                select_overload<const char *() const>(&WfsException::what),
                allow_raw_pointer<ret_val>())
      .function("error", &WfsException::error);

  enum_<EntryType>("EntryType")
      .value("file", EntryType::File)
      .value("directory", EntryType::Directory)
      .value("link", EntryType::Link);

  // Register Entry wrapper as the base class
  class_<Entry>("Entry")
      .smart_ptr<std::shared_ptr<Entry>>("shared_ptr<Entry>")
      .function("name", optional_override([](Entry &self) {
                  return std::string(self.name());
                }))
      .function("type", optional_override([](Entry &self) {
                  if (self.is_file())
                    return EntryType::File;
                  if (self.is_directory())
                    return EntryType::Directory;
                  if (self.is_link())
                    return EntryType::Link;
                  throw std::runtime_error("Unknown entry type");
                }))
      .function("owner", &Entry::owner)
      .function("group", &Entry::group)
      .function("mode", &Entry::mode)
      .function("creationTime", &Entry::creation_time)
      .function("modificationTime", &Entry::modification_time);

  // Register File wrapper with specific metadata method
  class_<File, base<Entry>>("File")
      .smart_ptr<std::shared_ptr<File>>("shared_ptr<File>")
      .function("size", &File::Size)
      .function("sizeOnDisk", &File::SizeOnDisk)
      .function("stream", optional_override([](File &self) {
                  return std::make_shared<File::stream>(
                      self.shared_from_this());
                }))
      .function("isEncrypted", &File::IsEncrypted);

  // Register Link wrapper - just uses base methods
  class_<Link, base<Entry>>("Link");

  // Register Directory wrapper with specific methods
  class_<Directory, base<Entry>>("Directory")
      .smart_ptr<std::shared_ptr<Directory>>("shared_ptr<Directory>")
      .function("getEntries", optional_override([](Directory &self) {
                  std::vector<std::shared_ptr<Entry>> entries;
                  for (auto it = self.begin(); it != self.end(); ++it) {
                    auto [name, entry_or_error] = *it;
                    if (entry_or_error.has_value()) {
                      entries.push_back(*entry_or_error);
                    } else {
                      throw WfsException(entry_or_error.error());
                    }
                  }
                  return entries;
                }))
      .function("getEntry",
                optional_override([](Directory &self, const std::string &path) {
                  auto entry = self.GetEntry(path);
                  if (!entry.has_value()) {
                    throw WfsException(entry.error());
                  }
                  return *entry;
                }))
      .function("isQuota", &Directory::is_quota)
      .function("quota", &Directory::quota);

  class_<Area>("Area")
      .smart_ptr<std::shared_ptr<Area>>("shared_ptr<Area>")
      .function("blockSize", &Area::block_size)
      .function("blocksCount", &Area::blocks_count);

  class_<QuotaArea, base<Area>>("Quota")
      .smart_ptr<std::shared_ptr<QuotaArea>>("shared_ptr<Quota>")
      .function("freeBlocksCount", optional_override([](QuotaArea &self) {
                  auto allocator = self.GetFreeBlocksAllocator();
                  if (!allocator.has_value()) {
                    throw WfsException(allocator.error());
                  }
                  return (*allocator)->free_blocks_count();
                }));

  // Register Device abstract class
  class_<Device>("Device")
      .function("ReadSectors", &Device::ReadSectors, pure_virtual())
      .function("WriteSectors", &Device::WriteSectors, pure_virtual())
      .function("SectorsCount", &Device::SectorsCount, pure_virtual())
      .function("Log2SectorSize", &Device::Log2SectorSize, pure_virtual())
      .function("IsReadOnly", &Device::IsReadOnly, pure_virtual())
      .function("SetSectorsCount", &Device::SetSectorsCount, pure_virtual())
      .function("SetLog2SectorSize", &Device::SetLog2SectorSize, pure_virtual())
      .allow_subclass<DeviceWrapper, std::shared_ptr<DeviceWrapper>>(
          "DeviceWrapper", "DeviceWrapperPtr")
      .smart_ptr<std::shared_ptr<Device>>("shared_ptr<Device>");

  // Register WfsDevice wrapper with simplified API
  class_<WfsDevice>("WfsDevice")
      .smart_ptr<std::shared_ptr<WfsDevice>>("shared_ptr<WfsDevice>")
      .class_function("Open", &OpenWfsDevice)
      .function("getRootDirectory", optional_override([](WfsDevice &self) {
                  auto rootDirectory = self.GetRootDirectory();
                  if (!rootDirectory.has_value()) {
                    throw WfsException(rootDirectory.error());
                  }
                  return *rootDirectory;
                }))
      .function("getEntry",
                optional_override([](WfsDevice &self, const std::string &path) {
                  return self.GetEntry(path);
                }))
      .function("flush", &WfsDevice::Flush);

  // Register File::stream class
  class_<File::stream>("FileStream")
      .smart_ptr<std::shared_ptr<File::stream>>("shared_ptr<FileStream>")
      .function("read", optional_override([](File::stream &self, uint32_t size,
                                             val callback) {
                  std::vector<uint8_t> data(size);
                  self.read(reinterpret_cast<char *>(data.data()), size);
                  callback(typed_memory_view(data.size(), data.data()));
                }))
      .function("seek", optional_override([](File::stream &self, uint32_t pos) {
                  self.seekg(pos);
                }))
      .function("position", &File::stream::tellg)
      .function("eof", &File::stream::eof);

  // Register helper functions
  function("getMLCKeyFromOTP", &GetMLCKeyFromOTP);
  function("getUSBKey", &GetUSBKey);

  // Register vector types
  register_vector<std::shared_ptr<Entry>>("VectorEntry");
  register_vector<uint8_t>("VectorByte");
}