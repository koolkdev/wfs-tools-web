declare module 'WfsLibModule' {
  export class Vector<T> {
    size(): number;
    get(index: number): T;
  }

  export enum WfsError {
    EntryNotFound,
    NotDirectory,
    NotFile,
    BlockBadHash,
    AreaHeaderCorrupted,
    DirectoryCorrupted,
    FreeBlocksAllocatorCorrupted,
    FileDataCorrupted,
    FileMetadataCorrupted,
    TransactionsAreaCorrupted,
    InvalidWfsVersion,
    NoSpace,
  }

  export enum EntryType {
    file,
    directory,
    link,
  }

  export class WfsException {
    constructor(error: WfsError);
    what(): string;
    error(): WfsError;
  }

  // Base Entry class
  export class Entry {
    name(): string;
    type(): EntryType;
    owner(): number;
    group(): number;
    mode(): number;
    creationTime(): number;
    modificationTime(): number;
  }

  // File stream class
  export class FileStream {
    read(size: number, callback: (data: Uint8Array) => void): void;
    seek(pos: number): void;
    position(): number;
    eof(): boolean;
  }

  // File class
  export class File extends Entry {
    size(): number;
    sizeOnDisk(): number;
    isEncrypted(): boolean;
    stream(): FileStream;
  }

  // Link class
  export class Link extends Entry {
    // Inherits base Entry methods
  }

  // QuotaArea class
  export class QuotaArea {
    blockSize(): number;
    blocksCount(): number;
    freeBlocksCount(): Promise<number>;
  }

  // Directory class
  export class Directory extends Entry {
    getEntries(): Promise<Vector<Entry>>;
    getEntry(name: string): Promise<Entry>;
    isQuota(): boolean;
    quota(): QuotaArea;
  }

  export interface Device {
    ReadSectors(data: Uint8Array, sectorAddress: number, sectorsCount: number): Promise<boolean>;
    WriteSectors(data: Uint8Array, sectorAddress: number, sectorsCount: number): Promise<boolean>;
    SectorsCount(): number;
    Log2SectorSize(): number;
    IsReadOnly(): boolean;
    SetSectorsCount(sectorsCount: number): void;
    SetLog2SectorSize(log2SectorSize: number): void;
  }

  export class WfsDevice {
    // Static methods
    static Open(device: Device, key: Uint8Array): Promise<WfsDevice>;

    // Instance methods
    getRootDirectory(): Promise<Directory>;
    getEntry(path: string): Promise<Entry>;
    flush(): void;
  }

  export interface WfsModuleType {
    WfsDevice: {
      Open(device: Device, key: Uint8Array): Promise<WfsDevice>;
    };
    WfsException: typeof WfsException;
    Entry: typeof Entry;
    File: typeof File;
    Directory: typeof Directory;
    Link: typeof Link;
    QuotaArea: typeof QuotaArea;
    EntryType: typeof EntryType;
    getMLCKeyFromOTP: (otpData: Uint8Array) => Vector<number>;
    getUSBKey: (otpData: Uint8Array, seepromData: Uint8Array) => Vector<number>;
    wfsErrorToString: (error: WfsError) => string;
    Device: {
      implement(device: Device): Device;
    };
    VectorEntry: typeof Vector<Entry>;
    VectorByte: typeof Vector<number>;
  }

  export default function (): Promise<WfsModuleType>;
}
