// src/components/charts/HorizontalBarChart.tsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { CategoricalChartData } from '../../types/analytics'; // Adjust path as needed

interface HorizontalBarChartProps {
  data: CategoricalChartData[];
  barDataKey?: string;      // Key for the bar value, defaults to "value"
  categoryDataKey?: string; // Key for the category label on Y-axis, defaults to "name"
  barColor?: string;
  aspect?: number;
  xAxisLabel?: string;      // Optional label for the X-axis (values)
  // If you want to display the value at the end of each bar
  showValueLabels?: boolean;
}

// Custom Tooltip for Bar Chart
const CustomBarTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-300 shadow-lg rounded text-sm">
        <p className="font-semibold">{`${label}`}</p> {/* Category name */}
        <p style={{ color: payload[0].fill }}>
          {/* Assuming only one bar series, payload[0].name would be the barDataKey */}
          {`Count: ${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  barDataKey = "value",
  categoryDataKey = "name",
  barColor = "#82ca9d", // A pleasant green
  aspect = 1.5, // Taller than wide for horizontal bars
  xAxisLabel,
  showValueLabels = false,
}) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available for chart.</div>;
  }

  // Sort data for better visual appeal if needed (e.g., descending)
  // const sortedData = [...data].sort((a, b) => b[barDataKey] - a[barDataKey]);

  return (
    <ResponsiveContainer width="100%" aspect={aspect}>
      <BarChart
        layout="vertical" // Key for horizontal bar chart
        data={data} // Use sortedData if you implement sorting
        margin={{
          top: 5,
          right: showValueLabels ? 40 : 30, // More space if value labels are shown
          left: 20,
          bottom: xAxisLabel ? 20 : 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={true} vertical={false} />
        <XAxis
          type="number" // Values are on X-axis
          tick={{ fontSize: 12, fill: '#666' }}
          dx={5}
          allowDecimals={false}
        >
          {xAxisLabel && (
            <text x="50%" y={25} dy={10} textAnchor="middle" fill="#666" fontSize={12}>
              {xAxisLabel}
            </text>
          )}
        </XAxis>
        <YAxis
          type="category" // Categories are on Y-axis
          dataKey={categoryDataKey}
          tick={{ fontSize: 12, fill: '#666' }}
          width={80} // Adjust width for longer category names
          dx={-5}
        />
        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(200,200,200,0.2)' }}/>
        <Bar dataKey={barDataKey} fill={barColor} barSize={20}>
          {showValueLabels && (
            <LabelList
              dataKey={barDataKey}
              position="right"
              style={{ fill: '#333', fontSize: '12px' }}
              formatter={(value: number) => value.toLocaleString()}
            />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default HorizontalBarChart;