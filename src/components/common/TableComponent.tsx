// src/components/common/TableComponent.tsx
import React from 'react';

// T represents the type of a single row data object
// K represents the keys of T
export interface ColumnDef<T> {
  header: string; // Text for the table header
  accessorKey?: keyof T; // Key to access data in the row object (if simple access)
  accessorFn?: (row: T) => string | number | React.ReactNode; // Function to derive cell data
  cellRenderer?: (value: any, row: T) => React.ReactNode; // Custom cell rendering
  headerTooltip?: string; // Tooltip for the header
  cellTooltipAccessorFn?: (row: T) => string | undefined; // Function to get tooltip for a cell
  thClassName?: string; // Optional class for <th>
  tdClassName?: string; // Optional class for <td>
}

interface TableComponentProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  error?: Error | null;
  noDataMessage?: string;
  tableClassName?: string;
  theadClassName?: string;
  tbodyClassName?: string;
  trClassName?: string;
}

const TableComponent = <T extends { id?: string | number }>({ // Assume row data has an id for key
  data,
  columns,
  isLoading = false,
  error = null,
  noDataMessage = "No data available.",
  tableClassName = "min-w-full divide-y divide-gray-200",
  theadClassName = "bg-gray-50",
  tbodyClassName = "bg-white divide-y divide-gray-200",
  trClassName = "",
}: TableComponentProps<T>) => {

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading table data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">Error loading data: {error.message}</div>;
  }

  if (!data || data.length === 0) {
    return <div className="p-6 text-center text-gray-500">{noDataMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className={tableClassName}>
        <thead className={theadClassName}>
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.header + index}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.thClassName || ''}`}
                title={col.headerTooltip}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={tbodyClassName}>
          {data.map((row, rowIndex) => (
            <tr key={(row.id || `row-${rowIndex}`) as React.Key} className={trClassName}>
              {columns.map((col, colIndex) => {
                let cellValue: any;
                if (col.accessorFn) {
                  cellValue = col.accessorFn(row);
                } else if (col.accessorKey) {
                  cellValue = row[col.accessorKey];
                }

                const displayValue = col.cellRenderer
                  ? col.cellRenderer(cellValue, row)
                  : (typeof cellValue === 'number' ? cellValue.toLocaleString() : cellValue);

                const cellTooltip = col.cellTooltipAccessorFn ? col.cellTooltipAccessorFn(row) : undefined;

                return (
                  <td
                    key={`${col.header}-${colIndex}-cell`}
                    className={`px-6 py-4 whitespace-nowrap text-sm ${
                        typeof cellValue === 'number' && !col.cellRenderer ? 'text-gray-500' : 'text-gray-900'
                    } ${col.tdClassName || ''}`}
                    title={cellTooltip}
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableComponent;