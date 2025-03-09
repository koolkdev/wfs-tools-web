import { Device, WfsModuleType } from 'WfsLibModule';

class JSFileDevice implements Device {
  private fileHandle: FileSystemFileHandle;
  private log2_sector_size: number;
  private read_only: boolean;
  private fileSize: number;
  private sectors_count: number;

  /**
   * Create a new JSFileDevice
   * @param fileHandle - The file handle
   * @param log2SectorSize - Log2 of the sector size (default: 9, which is 512 bytes)
   * @param readOnly - Whether the device is read-only (default: true)
   */
  constructor(
    fileHandle: FileSystemFileHandle,
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
  async initialize(): Promise<boolean> {
    try {
      // Get file size
      const file = await this.fileHandle.getFile();
      this.fileSize = file.size;

      // Calculate sectors count
      const sectorSize = 1 << this.log2_sector_size;
      this.sectors_count = Math.ceil(this.fileSize / sectorSize);

      console.log(
        `JSFileDevice initialized - Size: ${this.fileSize}, Sectors: ${this.sectors_count}`,
      );
      return true;
    } catch (error) {
      console.error('Error initializing JSFileDevice:', error);
      return false;
    }
  }

  /**
   * Read sectors from the device
   * @param data - The buffer to read into
   * @param sectorAddress - The starting sector address
   * @param sectorsCount - The number of sectors to read
   */
  async ReadSectors(
    data: Uint8Array,
    sectorAddress: number,
    sectorsCount: number,
  ): Promise<boolean> {
    const sectorSize = 1 << this.log2_sector_size;

    try {
      // Get the file once for all reads
      const file = await this.fileHandle.getFile();

      const offset = sectorAddress * sectorSize;
      const totalSize = sectorsCount * sectorSize;

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

  /**
   * Write sectors to the device
   * @param data - The buffer to write from
   * @param sectorAddress - The starting sector address
   * @param sectorsCount - The number of sectors to write
   */
  async WriteSectors(
    data: Uint8Array,
    sectorAddress: number,
    sectorsCount: number,
  ): Promise<boolean> {
    if (this.read_only) {
      throw new Error('Device is read-only');
    }

    const sectorSize = 1 << this.log2_sector_size;

    try {
      const offset = sectorAddress * sectorSize;
      const totalSize = sectorsCount * sectorSize;

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
}

export { JSFileDevice };
