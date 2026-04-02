import React from 'react';
import '../../styles/design-tokens.css';

interface Column<T> {
  key: string;
  title: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyText?: string;
  loading?: boolean;
}

export default function DataTable<T>({ data, columns, emptyText = 'Nenhum registro encontrado.', loading = false }: DataTableProps<T>) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={col.key || index}>{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-primary)' }}>
                Carregando...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex}>
                    {col.render ? col.render(row) : String((row as any)[col.key] || '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
