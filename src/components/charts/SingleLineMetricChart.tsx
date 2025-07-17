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
// src/components/charts/SingleLineMetricChart.tsx

// ... (Your imports remain at the top)

// --- REBUILD THE ENTIRE COMPONENT BODY ---

// (CustomSingleLineTooltip component can remain the same as before)

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
  // --- START DEBUGGING LOGS ---
  console.log(`--- DEBUG: Inside SingleLineMetricChart for '${lineName}' ---`);
  console.log("Received data prop:", data);
  // --- END DEBUGGING LOGS ---

  if (!data || data.length === 0) {
    // This is the message you are seeing. If the log above shows a valid array,
    // then something is wrong with this check or the data itself.
    console.log(`'${lineName}' chart is rendering "No data available" because the data prop is empty or undefined.`);
    return <div className="flex items-center justify-center h-full text-gray-500">No data available for chart.</div>;
  }

  // If the component reaches this point, it means it thinks it has valid data.
  console.log(`'${lineName}' chart is attempting to render with ${data.length} data points.`);

  return (
    <ResponsiveContainer width="100%" aspect={aspect}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: yAxisLabel ? 25 : 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey={xAxisDataKey}
          tick={{ fontSize: 12, fill: '#666' }}
          dy={5}
        />
        <YAxis tick={{ fontSize: 12, fill: '#666' }} dx={-5} allowDecimals={false}>
          {yAxisLabel && (
            <Label
              value={yAxisLabel}
              angle={-90}
              position="insideLeft"
              style={{ textAnchor: 'middle', fontSize: '12px', fill: '#333' }}
              dx={-10}
            />
          )}
        </YAxis>
        <Tooltip
            content={<CustomSingleLineTooltip peakInfoProvider={peakInfoProvider} />}
            cursor={{ stroke: lineColor, strokeDasharray: '3 3' }}
        />
        <Line
          type="monotone"
          dataKey={lineDataKey}
          name={lineName}
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