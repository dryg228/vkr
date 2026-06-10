import { ReactNode } from 'react';
import styles from './Table.module.scss';

export interface TableColumn<T> {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyText?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  onRowClick?: (row: T) => void;
}

export const Table = <T extends object>({
  columns,
  data,
  keyField,
  loading = false,
  emptyText = 'Нет данных',
  striped = true,
  hoverable = true,
  compact = false,
  onRowClick,
}: TableProps<T>) => {
  const tableClasses = [
    styles.table,
    striped ? styles.striped : '',
    hoverable ? styles.hoverable : '',
    compact ? styles.compact : '',
  ].filter(Boolean).join(' ');

  const getCellValue = (row: T, key: string): unknown => {
    return key.split('.').reduce((obj: unknown, k: string) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[k];
      }
      return undefined;
    }, row);
  };

  return (
    <div className={styles.wrapper}>
      <table className={tableClasses}>
        <thead className={styles.thead}>
          <tr>
            {columns.map(column => (
              <th 
                key={column.key}
                className={styles.th}
                style={{ 
                  width: column.width,
                  textAlign: column.align || 'left',
                }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className={styles.loading}>
                <span className={styles.spinner} />
                Загрузка...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr 
                key={String(row[keyField])}
                className={styles.tr}
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? 'pointer' : undefined }}
              >
                {columns.map(column => (
                  <td 
                    key={column.key}
                    className={styles.td}
                    style={{ textAlign: column.align || 'left' }}
                  >
                    {column.render 
                      ? column.render(row)
                      : String(getCellValue(row, column.key) ?? '')
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
