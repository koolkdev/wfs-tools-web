declare module 'WfsLibModule' {
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

  export class WfsException {
    constructor(error: WfsError);
    what(): string;
    error(): WfsError;
  }

  // File stream class
  class FileStream {
    read(size: number, callback: (data: Uint8Array) => void): Promise<void>;
    seek(pos: number): Promise<number>;
    position(): Promise<number>;
    eof(): Promise<boolean>;
    delete(): void;
  }

  export class WfsFile {
    getSize(): Promise<number>;
    getSizeOnDisk(): Promise<number>;
    getStream(): Promise<FileStream>;
  }

  export class WfsDirectory {
    getSize(): Promise<number>;
    listEntries(): Promise<VectorString>;
    hasEntry(name: string): Promise<boolean>;
    getFile(name: string): Promise<WfsFile>;
    getDirectory(name: string): Promise<WfsDirectory>;
    getEntryDetails(): Promise<
      Record<string, { type: 'file' | 'directory' | 'link'; size?: number }>
    >;
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
    // Static Open method
    static Open(device: Device, key: Uint8Array): Promise<WfsDevice>;
    getRootDirectory(): Promise<WfsDirectory>;
    getDirectory(path: string): Promise<WfsDirectory>;
    getFile(path: string): Promise<WfsFile>;
    hasEntry(path: string): Promise<boolean>;
    getEntryType(path: string): Promise<string>;
    flush(): Promise<void>;
  }

  export class VectorString {
    size(): number;
    get(index: number): string;
  }

  export type WfsError = number;

  export interface WfsModuleType {
    WfsDevice: {
      Open(device: Device, key: Uint8Array): Promise<WfsDevice>;
    };
    WfsException: typeof WfsException;
    File: typeof File;
    Directory: typeof Directory;
    getMLCKeyFromOTP: (otpData: Uint8Array) => Uint8Array;
    getUSBKey: (otpData: Uint8Array, seepromData: Uint8Array) => Uint8Array;
    wfsErrorToString: (error: WfsError) => string;
    Device: {
      implement(device: Device): Device;
    };
  }

  export default function (): Promise<WfsModuleType>;
}
