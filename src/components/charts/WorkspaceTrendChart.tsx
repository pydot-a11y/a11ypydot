// src/components/charts/WorkspaceTrendChart.tsx
import React, { useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LegendPayload,
  TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { WorkspaceTrendDataPoint } from '../../services/apiService'; // Adjust path as needed

interface WorkspaceTrendChartProps {
  data: WorkspaceTrendDataPoint[];
  aspect?: number;
}

// Define the keys for our lines and their display properties
const lineDetails = [
  { dataKey: 'active', name: 'Active', color: '#3b82f6' }, // blue-500
  { dataKey: 'created', name: 'Created', color: '#22c55e' }, // green-500
  { dataKey: 'deleted', name: 'Deleted', color: '#ef4444' }, // red-500
];

// Custom Tooltip Component
const CustomTooltipContent: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-300 shadow-lg rounded text-sm">
        <p className="font-semibold mb-1">{`Date: ${label}`}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const WorkspaceTrendChart: React.FC<WorkspaceTrendChartProps> = ({
  data,
  aspect = 3,
}) => {
  // State to manage the visibility of lines
  const [opacity, setOpacity] = useState<{ [key: string]: number }>({
    active: 1,
    created: 1,
    deleted: 1,
  });

  // Handler for legend item click to toggle line visibility
  const handleLegendClick = useCallback((e: { dataKey: string }) => {
    const { dataKey } = e;
    setOpacity((prevOpacity) => ({
      ...prevOpacity,
      [dataKey]: prevOpacity[dataKey] === 1 ? 0.2 : 1, // Dim if visible, make visible if dimmed
    }));
  }, []);

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available for chart.</div>;
  }

  return (
    <ResponsiveContainer width="100%" aspect={aspect}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#666' }}
          dy={5}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#666' }}
          dx={-5}
          allowDecimals={false} // Assuming counts are integers
        />
        <Tooltip content={<CustomTooltipContent />} />
        <Legend
          onClick={handleLegendClick}
          formatter={(value, entry) => (
            <span style={{ color: opacity[(entry as any).dataKey] === 1 ? '#333' : '#aaa' }}>
              {value}
            </span>
          )}
          iconType="plainline" // Use line icon for legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
        />
        {lineDetails.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name} // Name for tooltip and legend
            stroke={line.color}
            strokeWidth={2}
            activeDot={{ r: 6, strokeWidth: 1, fill: line.color }}
            dot={{ r: 3, strokeWidth: 1, fill: line.color }}
            strokeOpacity={opacity[line.dataKey]} // Control visibility via opacity
            connectNulls // Optional: if you want to connect points even if there's a null value in between
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default WorkspaceTrendChart;