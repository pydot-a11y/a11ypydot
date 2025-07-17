// src/components/common/TableComponent.tsx

import React from 'react';

/**
 * Defines the structure for a single column in the table.
 * @template T The type of the data object for each row.
 */
export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => string | number | React.ReactNode;
  cellRenderer?: (value: any, row: T) => React.ReactNode;
  headerTooltip?: string;
  cellTooltipAccessorFn?: (row: T) => string | undefined;
  thClassName?: string;
  tdClassName?: string;
}

/**
 * Props for the generic TableComponent.
 * @template T The type of the data object for each row.
 */
interface TableComponentProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  // --- THIS IS THE KEY CHANGE ---
  // A new, required prop to tell the component how to get a unique key for each row.
  // This can be a property key (like 'id' or 'name') or a function for complex keys.
  getRowKey: keyof T | ((row: T) => string | number);
  isLoading?: boolean;
  error?: Error | null;
  noDataMessage?: string;
  tableClassName?: string;
  theadClassName?: string;
  tbodyClassName?: string;
  trClassName?: string;
}

/**
 * A generic, reusable table component for displaying data arrays.
 * It handles loading, error, and empty states.
 * @template T A constraint to ensure the data passed is an array of objects.
 */
const TableComponent = <T extends object>({
  data,
  columns,
  getRowKey, // Destructure the new required prop
  isLoading = false,
  error = null,
  noDataMessage = "No data available.",
  tableClassName = "min-w-full divide-y divide-gray-200",
  theadClassName = "bg-gray-50",
  tbodyClassName = "bg-white divide-y divide-gray-200",
  trClassName = "",
}: TableComponentProps<T>) => {

  if (isLoading) {
    // You can use the animate-pulse class here too for consistency
    return <div className="p-6 text-center text-gray-500 animate-pulse">Loading table data...</div>;
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
          {data.map((row, rowIndex) => {
            // Use the new getRowKey prop to generate a stable, unique key for each row.
            // This makes the component much more flexible than forcing an 'id' property.
            const key = typeof getRowKey === 'function'
              ? getRowKey(row)
              : (row[getRowKey as keyof T] as React.Key);

            return (
              <tr key={key || rowIndex} className={trClassName}>
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
                      key={`${String(key)}-${colIndex}`}
                      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${col.tdClassName || ''}`}
                      title={cellTooltip}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TableComponent;