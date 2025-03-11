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
} from '@mui/material';
import { Folder, InsertDriveFile, Home as HomeIcon } from '@mui/icons-material';
import { useWfsLib } from '../services/wfslib/WfsLibProvider';

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

  const [entries, setEntries] = useState<
    Array<{
      name: string;
      type: 'directory' | 'file' | 'link';
      size?: number;
    }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!device || !module) {
      navigate('/load');
      return;
    }

    const fetchDirectoryEntries = async () => {
      setLoading(true);
      setError(null);

      try {
        const directory = await device.getDirectory(currentPath);
        const details = await directory.getEntryDetails();

        // Convert entries to our desired format
        const entryList = Object.entries(details).map(([name, detail]) => ({
          name,
          type: detail.type,
          size: detail.size,
        }));

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

  // Breadcrumb generation
  const breadcrumbs = useMemo(() => {
    const pathSegments = currentPath.split('/').filter(Boolean);
    return pathSegments.map((segment, index) => ({
      label: segment,
      path: `/${pathSegments.slice(0, index + 1).join('/')}`,
    }));
  }, [currentPath]);

  const handleEntryClick = (entry: { name: string; type: string }) => {
    if (entry.type === 'directory') {
      // Handle parent directory
      if (entry.name === '..') {
        navigate(`/browse${parentPath}`);
        return;
      }

      // Navigate to the selected directory
      const newPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
      navigate(`/browse${newPath}`);
    }
  };

  // Prepend parent directory entry if not at root
  const displayEntries = useMemo(() => {
    if (currentPath === '/') return entries;
    return [
      {
        name: '..',
        type: 'directory' as const,
      },
      ...entries,
    ];
  }, [currentPath, entries]);

  return (
    <Box>
      {/* Breadcrumbs */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={() => navigate('/browse/')} size="small" sx={{ mr: 2 }}>
          <HomeIcon />
        </IconButton>
        <Breadcrumbs aria-label="breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <Link
              key={crumb.path}
              color={index === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
              href="#"
              onClick={() => navigate(`/browse${crumb.path}`)}
            >
              {crumb.label}
            </Link>
          ))}
        </Breadcrumbs>
      </Paper>

      {/* Rest of the component remains the same */}
      {/* Directory Contents */}
      <Paper
        elevation={3}
        sx={{
          height: '500px', // Fixed height
          overflow: 'auto', // Enable scrolling
          position: 'relative',
        }}
      >
        {loading ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="100%"
          >
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Loading directory contents...</Typography>
          </Box>
        ) : error ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="100%"
          >
            <Alert severity="error" sx={{ width: '100%', maxWidth: 600 }}>
              {error}
              <Box mt={2} display="flex" justifyContent="center">
                {currentPath === '/' ? (
                  // If at root, link goes to Load Image
                  <Link component="button" onClick={() => navigate('/load')} color="primary">
                    Load another image
                  </Link>
                ) : (
                  // Otherwise, link goes up one directory
                  <Link
                    component="button"
                    onClick={() => navigate(`/browse${parentPath}`)}
                    color="primary"
                  >
                    Go up
                  </Link>
                )}
              </Box>
            </Alert>
          </Box>
        ) : displayEntries.length === 0 ? (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <Typography color="textSecondary">This directory is empty</Typography>
          </Box>
        ) : (
          <List
            sx={{
              height: '100%',
              overflowY: 'auto',
              padding: 0,
            }}
          >
            {displayEntries.map(entry => (
              <ListItem
                key={entry.name}
                onClick={() => handleEntryClick(entry)}
                divider
                sx={{
                  ...(entry.name === '..' && {
                    backgroundColor: 'action.hover',
                    fontStyle: 'italic',
                  }),
                }}
              >
                <ListItemIcon>
                  {entry.type === 'directory' ? (
                    entry.name === '..' ? (
                      <Folder color="disabled" />
                    ) : (
                      <Folder />
                    )
                  ) : (
                    <InsertDriveFile />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={entry.name}
                  secondary={entry.type === 'file' ? `${entry.size} bytes` : undefined}
                  primaryTypographyProps={{
                    ...(entry.name === '..' && { color: 'text.secondary' }),
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default DirectoryBrowserPage;
