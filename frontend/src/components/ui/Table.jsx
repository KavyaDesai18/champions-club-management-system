import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import Skeleton from './Skeleton';

export const Table = ({
  columns = [],
  data = [],
  isLoading = false,
  skeletonRows = 4,
  stickyHeader = true,
  itemsPerPage = 10,
  emptyMessage = 'No records found',
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  className = '',
}) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const comparison = valA > valB ? 1 : -1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortOrder]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  return (
    <div className={`w-full flex flex-col rounded-md border border-court-200 dark:border-court-800 bg-white dark:bg-court-900 overflow-hidden shadow-xs ${className}`}>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm border-collapse">
          <thead
            className={`
              text-xs text-court-700 dark:text-court-300 uppercase tracking-wider font-heading font-bold
              bg-court-100/90 dark:bg-court-950/90 border-b border-court-200 dark:border-court-800
              ${stickyHeader ? 'sticky top-0 z-10 backdrop-blur-md' : ''}
            `}
          >
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    className={`
                      py-3 px-4 select-none
                      ${col.sortable ? 'cursor-pointer hover:text-court-900 dark:hover:text-white transition' : ''}
                      ${col.headerClassName || ''}
                    `}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="text-court-400 dark:text-court-500">
                          {isSorted ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-optic-600 dark:text-optic-400 stroke-[2.5]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-optic-600 dark:text-optic-400 stroke-[2.5]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 stroke-[1.75]" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-court-200/80 dark:divide-court-800/60 text-court-800 dark:text-court-200">
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`scol-${cIdx}`} className="py-3 px-4">
                      <Skeleton className="h-4 w-3/4 rounded-xs" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-court-500 dark:text-court-400">
                    <Inbox className="w-8 h-8 text-court-400 dark:text-court-600 stroke-[1.5]" />
                    <span className="text-sm font-medium">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={row.id || `row-${rowIdx}`}
                  className="hover:bg-court-100/60 dark:hover:bg-court-850/60 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`py-3 px-4 text-court-800 dark:text-court-200 ${col.cellClassName || ''}`}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && sortedData.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-court-200 dark:border-court-800 bg-court-50 dark:bg-court-950/70 text-xs text-court-600 dark:text-court-400">
          <div className="tabular-nums">
            Showing <span className="font-semibold text-court-900 dark:text-court-200">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-semibold text-court-900 dark:text-court-200">
              {Math.min(currentPage * itemsPerPage, sortedData.length)}
            </span>{' '}
            of <span className="font-semibold text-court-900 dark:text-court-200">{sortedData.length}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-sm border border-court-200 dark:border-court-800 hover:bg-court-200/60 dark:hover:bg-court-800 text-court-700 dark:text-court-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-sm border border-court-200 dark:border-court-800 hover:bg-court-200/60 dark:hover:bg-court-800 text-court-700 dark:text-court-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
