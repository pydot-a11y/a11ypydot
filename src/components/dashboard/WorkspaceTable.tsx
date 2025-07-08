// src/components/WorkspaceTable.tsx
import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Skeleton,
  Chip
} from '@mui/material';
import { Workspace, C4Workspace } from '../types';

// Helper function to format ObjectId to date
const objectIdToDate = (id: string): Date => {
  const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
  return new Date(timestamp);
};

interface WorkspaceTableProps {
  title: string;
  workspaces: Workspace[] | C4Workspace[];
  isLoading: boolean;
  type: 'structurizr' | 'c4';
}

export const WorkspaceTable: React.FC<WorkspaceTableProps> = ({ 
  title,
  workspaces, 
  isLoading,
  type
}) => {
  // Generate table headers based on workspace type
  const getHeaders = () => {
    if (type === 'structurizr') {
      return (
        <TableRow>
          <TableCell>Instance</TableCell>
          <TableCell>Workspace ID</TableCell>
          <TableCell>EON ID</TableCell>
          <TableCell>Created Date</TableCell>
        </TableRow>
      );
    } else {
      return (
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Workspace ID</TableCell>
          <TableCell>Owner</TableCell>
          {type === 'c4' && <TableCell>View Count</TableCell>}
          <TableCell>Created Date</TableCell>
        </TableRow>
      );
    }
  };

  // Generate table rows based on workspace type
  const getRows = () => {
    if (type === 'structurizr') {
      return (workspaces as Workspace[]).map((workspace) => (
        <TableRow key={workspace._id}>
          <TableCell>{workspace.instance}</TableCell>
          <TableCell>{workspace.workspaceId}</TableCell>
          <TableCell>
            <Chip 
              label={workspace.eonid} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </TableCell>
          <TableCell>
            {formatDate(workspace._id)}
          </TableCell>
        </TableRow>
      ));
    } else {
      return (workspaces as C4Workspace[]).map((workspace) => (
        <TableRow key={workspace._id}>
          <TableCell>{workspace.name}</TableCell>
          <TableCell>{workspace.workspaceId}</TableCell>
          <TableCell>{workspace.owner}</TableCell>
          {type === 'c4' && <TableCell>{workspace.viewCount}</TableCell>}
          <TableCell>
            {workspace.createdAt instanceof Date 
              ? workspace.createdAt.toLocaleDateString() 
              : new Date(workspace.createdAt).toLocaleDateString()}
          </TableCell>
        </TableRow>
      ));
    }
  };

  // Helper to format ObjectId to readable date
  const formatDate = (id: string) => {
    try {
      const date = objectIdToDate(id);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return new Date(id).toLocaleDateString();
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        
        {isLoading ? (
          <Box>
            <Skeleton variant="rectangular" height={50} />
            <Skeleton variant="rectangular" height={50} sx={{ mt: 1 }} />
            <Skeleton variant="rectangular" height={50} sx={{ mt: 1 }} />
            <Skeleton variant="rectangular" height={50} sx={{ mt: 1 }} />
            <Skeleton variant="rectangular" height={50} sx={{ mt: 1 }} />
          </Box>
        ) : workspaces.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <Typography variant="body1" color="text.secondary">
              No workspaces found
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
            <Table>
              <TableHead>
                {getHeaders()}
              </TableHead>
              <TableBody>
                {getRows()}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};