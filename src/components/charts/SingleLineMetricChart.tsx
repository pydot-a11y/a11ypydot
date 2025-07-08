// src/components/charts/SingleLineMetricChart.tsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { DataPoint } from '../../types/analytics'; // Adjust path as needed

interface SingleLineMetricChartProps {
  data: DataPoint[];
  lineDataKey?: string;       // Key for the Y-axis value, defaults to "value"
  xAxisDataKey?: string;      // Key for the X-axis label, defaults to "date"
  lineName?: string;          // Name of the metric for the tooltip, e.g., "API Hits"
  lineColor?: string;
  aspect?: number;
  yAxisLabel?: string | null;      // Optional label for the Y-axis
  // For the peak label like in the C4TS Overview screenshot (e.g., "289 Hits March, 2025")
  // This will be passed to the tooltip if the hovered point matches the peak.
  peakInfoProvider?: (point: DataPoint) => string | null;
}

// Custom Tooltip for Single Line Chart
const CustomSingleLineTooltip: React.FC<TooltipProps<ValueType, NameType> & { peakInfoProvider?: (point: DataPoint) => string | null }> = ({
  active,
  payload,
  label,
  peakInfoProvider,
}) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as DataPoint; // The raw data point for this tooltip item
    const customPeakInfo = peakInfoProvider ? peakInfoProvider(dataPoint) : null;

    if (customPeakInfo) {
      // If peakInfoProvider returns a string, display that exclusively
      return (
        <div className="bg-primary-600 text-white p-2 border border-gray-300 shadow-lg rounded text-xs whitespace-nowrap">
          {customPeakInfo.split('\n').map((line, i) => <div key={i}>{line}</div>)}
        </div>
      );
    }

    // Default tooltip content
    return (
      <div className="bg-white p-2 border border-gray-300 shadow-lg rounded text-sm">
        <p className="font-semibold">{`Date: ${label}`}</p>
        <p style={{ color: payload[0].color }}>
          {`${payload[0].name}: ${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};


const SingleLineMetricChart: React.FC<SingleLineMetricChartProps> = ({
  data,
  lineDataKey = "value",
  xAxisDataKey = "date",
  lineName = "Value",
  lineColor = "#8884d8",
  aspect = 3,
  yAxisLabel,
  peakInfoProvider,
}) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available for chart.</div>;
  }

  return (
    <ResponsiveContainer width="100%" aspect={aspect}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30, // Allow space for potential labels/tooltips
          left: 20,  // Increased if yAxisLabel is present
          bottom: yAxisLabel ? 25 : 5, // Increased if x-axis label present
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey={xAxisDataKey}
          tick={{ fontSize: 12, fill: '#666' }}
          dy={5} // Adjust tick position
        />
        <YAxis tick={{ fontSize: 12, fill: '#666' }} dx={-5} allowDecimals={false}>
          {yAxisLabel && (
            <Label
              value={yAxisLabel}
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: 'middle', fontSize: '12px', fill: '#333' }}
              dx={-10} // Further adjust if needed
            />
          )}
        </YAxis>
        <Tooltip
            content={<CustomSingleLineTooltip peakInfoProvider={peakInfoProvider} />}
            cursor={{ stroke: lineColor, strokeDasharray: '3 3' }} // Custom cursor on hover
        />
        <Line
          type="monotone"
          dataKey={lineDataKey}
          name={lineName} // Name for the tooltip
          stroke={lineColor}
          strokeWidth={2}
          activeDot={{ r: 6, strokeWidth: 1, fill: lineColor, stroke: '#fff' }}
          dot={{ r: 3, strokeWidth: 1, fill: lineColor, stroke: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SingleLineMetricChart;