import React, { useState, useMemo } from 'react';
import { GlassCard, GlassButton } from '../index';
import styles from './DataTable.module.css';

interface Column<T> {
  key: keyof T;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  sortable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  className?: string;
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  sortable = true,
  pagination = true,
  pageSize = 10,
  className
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(data.length / pageSize);

  const handleSort = (column: keyof T) => {
    if (!sortable) return;
    
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <GlassCard className={`${styles.tableContainer} ${className || ''}`}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading data...</p>
        </div>
      </GlassCard>
    );
  }

  if (data.length === 0) {
    return (
      <GlassCard className={`${styles.tableContainer} ${className || ''}`}>
        <div className={styles.emptyState}>
          <p>{emptyMessage}</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`${styles.tableContainer} ${className || ''}`}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`${styles.headerCell} ${
                    column.sortable !== false && sortable ? styles.sortable : ''
                  } ${column.align ? styles[`align${column.align.charAt(0).toUpperCase() + column.align.slice(1)}`] : ''}`}
                  style={column.width ? { width: column.width } : undefined}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className={styles.headerContent}>
                    {column.header}
                    {sortable && column.sortable !== false && (
                      <div className={styles.sortIcons}>
                        <span className={`${styles.sortIcon} ${
                          sortColumn === column.key && sortDirection === 'asc' ? styles.active : ''
                        }`}>↑</span>
                        <span className={`${styles.sortIcon} ${
                          sortColumn === column.key && sortDirection === 'desc' ? styles.active : ''
                        }`}>↓</span>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr
                key={index}
                className={`${styles.dataRow} ${onRowClick ? styles.clickable : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`${styles.dataCell} ${
                      column.align ? styles[`align${column.align.charAt(0).toUpperCase() + column.align.slice(1)}`] : ''
                    }`}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className={styles.pagination}>
          <GlassButton
            variant="button"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </GlassButton>
          
          <div className={styles.pageNumbers}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <GlassButton
                key={page}
                variant={currentPage === page ? "light" : "button"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className={styles.pageButton}
              >
                {page}
              </GlassButton>
            ))}
          </div>
          
          <GlassButton
            variant="button"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </GlassButton>
        </div>
      )}
    </GlassCard>
  );
}

export default DataTable;
