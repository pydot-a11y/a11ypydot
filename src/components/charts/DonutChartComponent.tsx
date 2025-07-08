// src/components/charts/DonutChartComponent.tsx
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

// Assuming AccessMethodData is defined in your apiService or a common types file
// For this component, let's define a more generic input type if needed,
// or directly use AccessMethodData if it's always the source.
// Let's use a generic approach for reusability, then adapt it.
export interface DonutChartDataItem {
  name: string;  // Label for the slice
  value: number; // Value determining the slice size
  color: string; // Hex color for the slice
}

interface DonutChartComponentProps {
  data: DonutChartDataItem[];
  dataKey?: string; // The key in data items for the value, defaults to "value"
  nameKey?: string; // The key in data items for the name/label, defaults to "name"
  aspect?: number;
  innerRadius?: string | number; // e.g., "60%" or 60
  outerRadius?: string | number; // e.g., "80%" or 80
  showTooltip?: boolean;
  showLegend?: boolean;
  // To display a label in the center of the donut
  centerText?: { primary: string; secondary?: string };
}

// Custom Tooltip for Donut Chart
const CustomDonutTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0];
    return (
      <div className="bg-white p-2 border border-gray-300 shadow-lg rounded text-sm">
        <p style={{ color: dataItem.payload?.fill || dataItem.color }}>
          {`${dataItem.name}: ${dataItem.value?.toLocaleString()}`}
        </p>
        {/* You can add percentage calculation here if needed */}
        {/* Example: <p>Percentage: {((dataItem.value / total) * 100).toFixed(1)}%</p> (would need 'total') */}
      </div>
    );
  }
  return null;
};


const DonutChartComponent: React.FC<DonutChartComponentProps> = ({
  data,
  dataKey = "value",
  nameKey = "name",
  aspect = 1, // Typically square
  innerRadius = "60%",
  outerRadius = "80%",
  showTooltip = true,
  showLegend = false, // Legend is often replaced by table in your wireframe
  centerText,
}) => {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available for chart.</div>;
  }

  return (
    <ResponsiveContainer width="100%" aspect={aspect}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          fill="#8884d8" // Default fill, overridden by Cell
          paddingAngle={data.length > 1 ? 1 : 0} // Small gap between slices
          dataKey={dataKey}
          nameKey={nameKey}
          labelLine={false} // Hide lines to labels if labels are simple or not shown
          // label={renderCustomizedLabel} // If you need custom labels on slices
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || '#CCCCCC'} stroke={entry.color || '#CCCCCC'} />
          ))}
        </Pie>
        {showTooltip && <Tooltip content={<CustomDonutTooltip />} />}
        {showLegend && (
            <Legend
                iconSize={10}
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                verticalAlign="bottom"
                align="center"
            />
        )}
        {centerText && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: '18px', fontWeight: 'bold', fill: '#333' }}
          >
            {centerText.primary}
          </text>
        )}
        {centerText && centerText.secondary && (
           <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            dy="1.2em" // Offset the secondary text slightly below the primary
            style={{ fontSize: '12px', fill: '#666' }}
          >
            {centerText.secondary}
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
};

export default DonutChartComponent;

// Optional: Example of a custom label function if you need labels on the slices
// const RADIAN = Math.PI / 180;
// const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
//   const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
//   const x = cx + radius * Math.cos(-midAngle * RADIAN);
//   const y = cy + radius * Math.sin(-midAngle * RADIAN);

//   return (
//     <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>
//       {`${name} (${(percent * 100).toFixed(0)}%)`}
//     </text>
//   );
// };