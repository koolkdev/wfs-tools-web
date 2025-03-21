import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Box,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  IconButton,
  Table,
  TableHead,
  TableContainer,
  TableCell,
  TableBody,
  TableRow,
  Checkbox,
  Stack,
  Divider,
  Button,
  ListSubheader,
} from '@mui/material';
import {
  Folder,
  InsertDriveFile,
  Home as HomeIcon,
  ArrowUpward,
  Info as InfoIcon,
  Storage as StorageIcon,
  AccessTime as AccessTimeIcon,
  Person,
  Group,
  Download,
  Close,
} from '@mui/icons-material';
import { useWfsLib } from '../services/wfslib/WfsLibProvider';
import type { Entry, EntryType, File } from 'WfsLibModule';

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
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, px: 2 }}>
      {/* NAV / BREADCRUMB BAR */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 2, // margin below the nav bar
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0, // nav bar should not shrink
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton color="primary" onClick={() => navigate('/browse/')}>
            <HomeIcon />
          </IconButton>
          <IconButton
            color="primary"
            onClick={() => navigate(`/browse${parentPath}`)}
            disabled={currentPath === '/'}
          >
            <ArrowUpward />
          </IconButton>

          {/* Breadcrumbs */}

          <Breadcrumbs maxItems={5} sx={{ ml: 1 }}>
            {currentPath
              .split('/')
              .filter(Boolean)
              .map((crumb, idx, arr) => (
                <Link
                  key={crumb}
                  underline="hover"
                  color={idx === arr.length - 1 ? 'text.primary' : 'inherit'}
                  onClick={() => navigate(`/browse/${arr.slice(0, idx + 1).join('/')}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  {crumb}
                </Link>
              ))}
          </Breadcrumbs>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={1}>
          {/* X button */}
          <IconButton color="primary" onClick={() => navigate('/load')}>
            <Close />
          </IconButton>
        </Stack>
      </Paper>

      {/* MAIN CONTENT AREA: table (left) + preview (right) */}
      <Box
        sx={{
          flex: 1, // fill leftover vertical space
          display: 'flex', // horizontal layout: table on left, preview on right
          gap: 2, // space between them
          overflow: 'hidden', // so each child can scroll internally
          minHeight: 0,
        }}
      >
        {/* Directory Contents */}
        <Paper
          elevation={3}
          sx={{
            flex: 1, // take all remaining vertical space
            minHeight: 0, // critical for flex scroll to work
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                mt: 4,
              }}
            >
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                flex: 1,
                minHeight: 0, // critical
                overflow: 'auto', // scrollbar on overflow
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox />
                    </TableCell>
                    <TableCell align="center" sx={{ width: 50 }}></TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Modified</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map(entry => (
                    <TableRow
                      key={entry.name}
                      hover
                      onClick={() =>
                        entry.type === 'directory'
                          ? navigate(`/browse${currentPath}/${entry.name}`)
                          : setSelectedFile(entry)
                      }
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox />
                      </TableCell>
                      <TableCell align="center">
                        {entry.type === 'directory' ? (
                          <Folder color="primary" />
                        ) : (
                          <InsertDriveFile />
                        )}
                      </TableCell>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell>
                        {entry.size !== undefined ? `${entry.size} bytes` : '-'}
                      </TableCell>
                      <TableCell>{entry.modificationTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* RIGHT: DETAILS / PREVIEW PANE */}
        <Paper
          variant="outlined"
          sx={{
            flexShrink: 0,
            width: 350,
            display: 'flex',
            flexDirection: 'column',
            p: 2,
            minHeight: 0,
            overflowY: 'auto', // let preview scroll if it’s tall
          }}
        >
          <Typography variant="h6" gutterBottom>
            Details / Preview
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {selectedFile ? (
            <>
              <List dense subheader={<ListSubheader disableSticky>File Information</ListSubheader>}>
                <ListItem>
                  <ListItemIcon>
                    <InsertDriveFile />
                  </ListItemIcon>
                  <ListItemText primary="Name" secondary={selectedFile.name} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText primary="Type" secondary={selectedFile.type.toUpperCase()} />
                </ListItem>
                {selectedFile.size !== undefined && (
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon />
                    </ListItemIcon>
                    <ListItemText primary="Size" secondary={`${selectedFile.size} bytes`} />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemIcon>
                    <Group />
                  </ListItemIcon>
                  <ListItemText primary="Group" secondary={selectedFile.group} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Person />
                  </ListItemIcon>
                  <ListItemText primary="Owner" secondary={selectedFile.owner} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AccessTimeIcon />
                  </ListItemIcon>
                  <ListItemText primary="Modified" secondary={selectedFile.modificationTime} />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AccessTimeIcon />
                  </ListItemIcon>
                  <ListItemText primary="Created" secondary={selectedFile.creationTime} />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  color="success"
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
                  Download
                </Button>
                {/*<Button variant="contained" startIcon={<Edit />}>
                  Edit
                </Button>
                <Button variant="outlined" color="error" startIcon={<Delete />}>
                  Delete
                </Button>*/}
              </Stack>
            </>
          ) : (
            <Typography>Select a file or folder to see details.</Typography>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default DirectoryBrowserPage;
