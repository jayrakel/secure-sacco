import { type ReactNode, type CSSProperties, useState } from 'react';
import { PRIMITIVE_TOKENS } from '@/shared/design';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface TableColumn {
  header: string;
  accessor: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => ReactNode;
}

export interface TableProps {
  columns: TableColumn[];
  data: any[];
  striped?: boolean;
  hoverable?: boolean;
  sortable?: boolean;
  rowClassName?: string;
}

export function Table({
  columns,
  data,
  striped = false,
  hoverable = true,
  sortable = true,
  rowClassName,
}: TableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  const sortedData = sortConfig
    ? [...data].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      })
    : data;

  const handleSort = (accessor: string) => {
    setSortConfig((prev) => {
      if (prev?.key === accessor) {
        return {
          key: accessor,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key: accessor, direction: 'asc' };
    });
  };

  const headerStyles: CSSProperties = {
    backgroundColor: 'var(--surface-secondary)',
    borderBottom: `2px solid var(--border-default)`,
    padding: PRIMITIVE_TOKENS.spacing[3],
    fontWeight: PRIMITIVE_TOKENS.fontWeight.bold,
    fontSize: PRIMITIVE_TOKENS.fontSize.sm[0],
    color: 'var(--text-primary)',
    textAlign: 'left',
  };

  const cellStyles: CSSProperties = {
    padding: PRIMITIVE_TOKENS.spacing[3],
    borderBottom: `1px solid var(--border-light)`,
    color: 'var(--text-primary)',
    fontSize: PRIMITIVE_TOKENS.fontSize.base[0],
  };

  return (
    <div
      style={{
        overflowX: 'auto',
        borderRadius: PRIMITIVE_TOKENS.radius.lg,
        border: `1px solid var(--border-default)`,
        boxShadow: PRIMITIVE_TOKENS.shadow.sm,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'var(--surface-primary)',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: 'var(--surface-secondary)' }}>
            {columns.map((column, idx) => (
              <th
                key={idx}
                style={{
                  ...headerStyles,
                  width: column.width,
                  textAlign: column.align || 'left',
                  cursor: sortable ? 'pointer' : 'default',
                }}
                onClick={() => sortable && handleSort(column.accessor)}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: PRIMITIVE_TOKENS.spacing[2],
                  }}
                >
                  {column.header}
                  {sortable && sortConfig?.key === column.accessor && (
                    <span style={{ fontSize: '12px' }}>
                      {sortConfig.direction === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              style={{
                backgroundColor:
                  striped && rowIdx % 2 === 1
                    ? 'var(--surface-secondary)'
                    : 'var(--surface-primary)',
                transition: PRIMITIVE_TOKENS.transition.fast,
              }}
              onMouseEnter={(e) => {
                if (hoverable) {
                  const el = e.currentTarget as HTMLElement;
                  el.style.backgroundColor = 'var(--surface-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (hoverable) {
                  const el = e.currentTarget as HTMLElement;
                  el.style.backgroundColor =
                    striped && rowIdx % 2 === 1
                      ? 'var(--surface-secondary)'
                      : 'var(--surface-primary)';
                }
              }}
              className={rowClassName}
            >
              {columns.map((column, colIdx) => (
                <td
                  key={colIdx}
                  style={{
                    ...cellStyles,
                    width: column.width,
                    textAlign: column.align || 'left',
                  }}
                >
                  {column.render
                    ? column.render(row[column.accessor], row)
                    : row[column.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;

