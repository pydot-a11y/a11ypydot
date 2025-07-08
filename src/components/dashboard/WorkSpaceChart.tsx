// src/components/WorkspaceChart.tsx
import React from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Skeleton } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { AnalyticsDataPoint } from '../types';

// Helper function to format dates
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};

interface WorkspaceChartProps {
  title: string;
  data: AnalyticsDataPoint[];
  isLoading: boolean;
  isFetching: boolean;
}

export const WorkspaceChart: React.FC<WorkspaceChartProps> = ({ 
  title,
  data, 
  isLoading, 
  isFetching 
}) => {
  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {title}
          </Typography>
          {isFetching && !isLoading && (
            <Typography variant="body2" color="text.secondary">
              Refreshing data...
            </Typography>
          )}
        </Box>
        
        {isLoading ? (
          <Skeleton variant="rectangular" height={400} animation="wave" />
        ) : data.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="400px">
            <Typography variant="body1" color="text.secondary">
              No data available for the selected filters
            </Typography>
          </Box>
        ) : (
          <Box height="400px" position="relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  height={60}
                  tickFormatter={formatDate}
                  tick={{
                    angle: -45,
                    textAnchor: 'end',
                    fill: '#4A5568'
                  }}
                />
                <YAxis
                  tick={{ fill: '#4A5568' }}
                  tickFormatter={(value) => value.toFixed(0)}
                />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value: number) => [value, 'Workspaces']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '8px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3182CE"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3182CE' }}
                  activeDot={{ r: 6, fill: '#2B6CB0' }}
                  name="Workspaces Created"
                  isAnimationActive={!isFetching}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};