import { Device } from 'WfsLibModule';

export class JSFileDevice implements Device {
  protected fileHandle: FileSystemFileHandle | File;
  protected log2_sector_size: number;
  protected read_only: boolean;
  protected fileSize: number;
  protected sectors_count: number;

  constructor(
    fileHandle: FileSystemFileHandle | File,
    log2SectorSize: number = 9,
    readOnly: boolean = true,
  ) {
    this.fileHandle = fileHandle;
    this.log2_sector_size = log2SectorSize;
    this.read_only = readOnly;
    this.fileSize = 0;
    this.sectors_count = 0;

    // Initialize async (will be wrapped by async Emscripten binding)
    this.initialize();
  }

  /**
   * Initialize the device - gets file size and calculates sector count
   */
  protected async initialize(): Promise<boolean> {
    try {
      // Get file size - handle both FileSystemFileHandle and File
      const file =
        this.fileHandle instanceof File ? this.fileHandle : await this.fileHandle.getFile();

      this.fileSize = file.size;

      // Calculate sectors count
      const sectorSize = 1 << this.log2_sector_size;
      this.sectors_count = Math.ceil(this.fileSize / sectorSize);

      console.log(
        `BaseFileDevice initialized - Size: ${this.fileSize}, Sectors: ${this.sectors_count}`,
      );
      return true;
    } catch (error) {
      console.error('Error initializing BaseFileDevice:', error);
      return false;
    }
  }

  /**
   * Common ReadSectors implementation
   */
  async ReadSectors(
    data: Uint8Array,
    sectorAddress: number,
    sectorsCount: number,
  ): Promise<boolean> {
    try {
      const { offset, totalSize } = this.calculateSectorParameters(sectorAddress, sectorsCount);

      // Get the file once for all reads
      const file =
        this.fileHandle instanceof File ? this.fileHandle : await this.fileHandle.getFile();

      if (offset + totalSize > this.fileSize) {
        throw new Error('Reading beyond device size');
      }

      // Create a slice of the file for all sectors at once
      const slice = file.slice(offset, offset + totalSize);

      // Read all sectors in one go
      const buffer = await slice.arrayBuffer();
      const sectorData = new Uint8Array(buffer);

      // Copy entire buffer at once
      data.set(sectorData, 0);

      return true;
    } catch (error) {
      console.error('Error reading sectors:', error);
      return false;
    }
  }

  async WriteSectors(
    data: Uint8Array,
    sectorAddress: number,
    sectorsCount: number,
  ): Promise<boolean> {
    if (this.read_only) {
      throw new Error('Device is read-only');
    }

    if (!(this.fileHandle instanceof FileSystemFileHandle)) {
      throw new Error('Write operations require a FileSystemFileHandle');
    }

    try {
      const { offset, totalSize } = this.calculateSectorParameters(sectorAddress, sectorsCount);

      if (offset + totalSize > this.fileSize) {
        throw new Error('Writing beyond device size');
      }

      // Get a writable stream
      const writable = await this.fileHandle.createWritable({ keepExistingData: true });

      // Seek to the desired position
      await writable.seek(offset);

      // Create a slice of the data to write
      const sectorData = data.slice(0, totalSize);

      // Write the data
      await writable.write(sectorData);

      // Close the stream
      await writable.close();

      return true;
    } catch (error) {
      console.error('Error writing sectors:', error);
      return false;
    }
  }

  /**
   * Get the number of sectors
   * @returns The number of sectors
   */
  SectorsCount(): number {
    return this.sectors_count;
  }

  /**
   * Get the log2 of the sector size
   * @returns The log2 of the sector size
   */
  Log2SectorSize(): number {
    return this.log2_sector_size;
  }

  /**
   * Check if the device is read-only
   * @returns True if the device is read-only
   */
  IsReadOnly(): boolean {
    return this.read_only;
  }

  /**
   * Set the number of sectors
   * @param sectorsCount - The new number of sectors
   */
  SetSectorsCount(sectorsCount: number): void {
    this.sectors_count = sectorsCount;
  }

  /**
   * Set the log2 of the sector size
   * @param log2SectorSize - The new log2 of the sector size
   */
  SetLog2SectorSize(log2SectorSize: number): void {
    this.log2_sector_size = log2SectorSize;
  }

  // Protected utility method for common sector calculations
  protected calculateSectorParameters(sectorAddress: number, sectorsCount: number) {
    const sectorSize = 1 << this.log2_sector_size;
    const offset = sectorAddress * sectorSize;
    const totalSize = sectorsCount * sectorSize;

    return { offset, totalSize };
  }
}
