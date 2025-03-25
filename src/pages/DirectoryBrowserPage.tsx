import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Entry, EntryType, File } from 'WfsLibModule';
import { useWfsLib } from '../services/wfslib/WfsLibProvider';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';

// Lucide icons
import {
  FolderIcon,
  FileIcon,
  HomeIcon,
  ArrowUpIcon,
  InfoIcon,
  DatabaseIcon,
  ClockIcon,
  UserIcon,
  UsersIcon,
  DownloadIcon,
  XIcon,
} from 'lucide-react';

interface EntryInfo {
  entry: Entry;
  name: string;
  type: 'directory' | 'file' | 'link';
  size?: number;
  owner?: string;
  group?: string;
  creationTime?: string;
  modificationTime?: string;
}

const DirectoryBrowserPage: React.FC = () => {
  const { device, module, asyncQueue } = useWfsLib();
  const { '*': pathParam } = useParams();
  const navigate = useNavigate();

  // Ensure path always starts with a slash and remove trailing slash
  const currentPath = useMemo(() => {
    const cleanPath = pathParam ? `/${pathParam.replace(/^\/|\/$/g, '')}` : '/';
    return cleanPath === '' ? '/' : cleanPath;
  }, [pathParam]);

  // Calculate parent path
  const parentPath = useMemo(() => {
    const lastSlashIndex = currentPath.lastIndexOf('/');
    if (lastSlashIndex <= 0) return '/';
    return currentPath.substring(0, lastSlashIndex) || '/';
  }, [currentPath]);

  const [entries, setEntries] = useState<Array<EntryInfo>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<EntryInfo | null>(null);

  useEffect(() => {
    if (!device || !module) {
      navigate('/load');
      return;
    }

    const typeMapping = new Map<EntryType, 'directory' | 'file' | 'link'>([
      [module.EntryType.directory, 'directory'],
      [module.EntryType.file, 'file'],
      [module.EntryType.link, 'link'],
    ]);

    const fetchDirectoryEntries = async () => {
      setLoading(true);
      setError(null);

      try {
        const directory = await device.getEntry(currentPath);

        // Check if the entry is a directory
        if (directory.type() !== module.EntryType.directory) {
          throw new Error('Not a directory');
        }

        // Cast to Directory type
        const dir = directory as typeof module.Directory.prototype;

        // Get all entries in the directory
        const entriesVector = await dir.getEntries();
        const entryCount = entriesVector.size();

        // Convert entries to our desired format
        const entryList = [];

        for (let i = 0; i < entryCount; i++) {
          const entry = entriesVector.get(i);
          const entryName = entry.name();
          const entryType = entry.type();

          // as 8 chars hex
          const owner = entry.owner().toString(16).padStart(8, '0');
          const group = entry.group().toString(16).padStart(8, '0');

          const creationTime = new Date(entry.creationTime() * 1000).toLocaleString();
          const modificationTime = new Date(entry.modificationTime() * 1000).toLocaleString();

          let size: number | undefined = undefined;
          if (entryType === module.EntryType.file) {
            // Cast to File type to get size
            const fileEntry = entry as typeof module.File.prototype;
            size = fileEntry.size();
          }

          entryList.push({
            entry,
            name: entryName,
            type: typeMapping.get(entryType) as 'directory' | 'file' | 'link',
            size,
            owner,
            group,
            creationTime,
            modificationTime,
          });
        }

        // Sort entries: directories first, then alphabetically
        entryList.sort((a, b) => {
          if (a.type === 'directory' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        });

        setEntries(entryList);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load directory';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    asyncQueue.execute(fetchDirectoryEntries);
  }, [currentPath, device, module, navigate, asyncQueue]);

  return (
    <div className="flex flex-col flex-1 min-h-0 px-4 gap-4">
      {/* Navigation Bar */}
      <div className="bg-card p-4 rounded-lg shadow-sm border flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="icon" onClick={() => navigate('/browse/')} title="Home">
          <HomeIcon className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/browse${parentPath}`)}
          disabled={currentPath === '/'}
          title="Up"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="flex items-center ml-2">
          <ol className="flex flex-wrap items-center gap-1">
            {currentPath
              .split('/')
              .filter(Boolean)
              .map((crumb, idx, arr) => (
                <React.Fragment key={crumb}>
                  {idx > 0 && <span className="text-muted-foreground mx-1">/</span>}
                  <li>
                    <Button
                      variant="link"
                      className={
                        idx === arr.length - 1
                          ? 'text-primary font-medium p-0'
                          : 'text-muted-foreground p-0'
                      }
                      onClick={() => navigate(`/browse/${arr.slice(0, idx + 1).join('/')}`)}
                    >
                      {crumb}
                    </Button>
                  </li>
                </React.Fragment>
              ))}
          </ol>
        </nav>

        <div className="flex-1" />

        <Button variant="ghost" size="icon" onClick={() => navigate('/load')} title="Close">
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        {/* Directory Contents */}
        <div className="bg-card rounded-lg shadow-sm border flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin h-8 w-8 border-4 rounded-full border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell className="w-[40px]">
                      <Checkbox />
                    </TableCell>
                    <TableCell className="w-[40px]"></TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Modified</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(entry => (
                    <TableRow
                      key={entry.name}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        entry.type === 'directory'
                          ? navigate(`/browse${currentPath}/${entry.name}`)
                          : setSelectedFile(entry)
                      }
                    >
                      <TableCell>
                        <Checkbox onClick={e => e.stopPropagation()} />
                      </TableCell>
                      <TableCell>
                        {entry.type === 'directory' ? (
                          <FolderIcon className="h-4 w-4" />
                        ) : (
                          <FileIcon className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell>
                        {entry.size !== undefined ? `${entry.size} bytes` : '-'}
                      </TableCell>
                      <TableCell>{entry.modificationTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Details / Preview Pane */}
        <div className="bg-card rounded-lg shadow-sm border p-4 flex-shrink-0 w-80 overflow-y-auto">
          <h3 className="text-lg font-medium mb-2">Details / Preview</h3>
          <Separator className="mb-4" />

          {selectedFile ? (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">File Information</h4>

                  <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                    <FileIcon className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                    <InfoIcon className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedFile.type.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {selectedFile.size !== undefined && (
                    <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                      <DatabaseIcon className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">Size</p>
                        <p className="text-sm text-muted-foreground">{selectedFile.size} bytes</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                    <UsersIcon className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Group</p>
                      <p className="text-sm text-muted-foreground">{selectedFile.group}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                    <UserIcon className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Owner</p>
                      <p className="text-sm text-muted-foreground">{selectedFile.owner}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                    <ClockIcon className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Modified</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedFile.modificationTime}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                    <ClockIcon className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">{selectedFile.creationTime}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      const fileStream = (selectedFile.entry as File).stream();
                      const fileData = new Uint8Array(selectedFile.size!);
                      fileStream.read(selectedFile.size!, (data: Uint8Array) => {
                        fileData.set(data);
                      });
                      const blob = new Blob([fileData], { type: 'application/octet-stream' });
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                    }}
                  >
                    <DownloadIcon className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Select a file or folder to see details.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectoryBrowserPage;
