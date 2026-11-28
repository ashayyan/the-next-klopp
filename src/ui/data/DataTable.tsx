import type { KeyboardEvent, ReactNode } from "react";

export interface DataColumn<R> {
  id: string;
  header: ReactNode;
  cell: (row: R) => ReactNode;
  /** Right-aligned mono numerals with tabular figures. */
  numeric?: boolean;
  /** Extra classes for the header and cells, for example `max-md:hidden` for a wide-only column. */
  className?: string;
}

export interface DataTableProps<R> {
  caption: string;
  columns: readonly DataColumn<R>[];
  rows: readonly R[];
  rowKey: (row: R) => string;
  /** The row that matches the clock: panel tone and `aria-selected`. */
  activeRow?: string | null;
  /** Accessible label for a focusable row. */
  rowLabel?: (row: R) => string;
  /** Hover or focus moved onto a row (null when it leaves). */
  onRowPreview?: (row: R | null) => void;
  /** Enter on a focused row. */
  onRowEnter?: (row: R) => void;
  /** Shown instead of rows when there are none: heading and body. */
  empty?: { heading: string; body: string };
  /** Classes for the table (row rules of a direction). */
  className?: string;
  rowClassName?: string;
  /** Forced look for the gallery, written to `data-state`. */
  state?: string;
  /** Forced look of one row (the gallery's hover row), written to that row's `data-state`. */
  rowState?: (row: R) => string | undefined;
}

/**
 * A captioned table with right-aligned mono numerals. With `onRowEnter` the rows are focusable
 * (a grid of selectable rows): each is at least 44 px tall and 8 px from the next, shows the focus
 * ring, and the row that matches the clock carries `aria-selected="true"`.
 */
export function DataTable<R>({
  caption,
  columns,
  rows,
  rowKey,
  activeRow,
  rowLabel,
  onRowPreview,
  onRowEnter,
  empty,
  className,
  rowClassName,
  state,
  rowState,
}: DataTableProps<R>) {
  const interactive = onRowEnter !== undefined;
  const align = (c: DataColumn<R>) =>
    c.numeric ? "whitespace-nowrap text-right font-mono tabular-nums" : "text-left";

  if (rows.length === 0 && empty) {
    return (
      <div data-table-empty className="flex flex-col gap-1 bg-surface-panel p-4">
        <p className="font-semibold text-body">{empty.heading}</p>
        <p className="text-label text-ink-muted">{empty.body}</p>
      </div>
    );
  }

  return (
    <table
      role={interactive ? "grid" : undefined}
      data-state={state}
      className={`w-full border-separate border-spacing-x-0 border-spacing-y-3 text-label md:text-body ${className ?? ""}`}
    >
      <caption className="pb-1 text-left font-semibold text-label">{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.id}
              scope="col"
              className={`px-2 pb-1 font-semibold text-label text-ink-muted ${align(c)} ${c.className ?? ""}`}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const key = rowKey(row);
          const active = activeRow === key;
          return (
            <tr
              key={key}
              data-row={key}
              data-state={rowState?.(row)}
              aria-selected={interactive ? active : undefined}
              aria-label={interactive ? rowLabel?.(row) : undefined}
              tabIndex={interactive ? 0 : undefined}
              onMouseEnter={onRowPreview ? () => onRowPreview(row) : undefined}
              onMouseLeave={onRowPreview ? () => onRowPreview(null) : undefined}
              onFocus={onRowPreview ? () => onRowPreview(row) : undefined}
              onBlur={onRowPreview ? () => onRowPreview(null) : undefined}
              onKeyDown={
                interactive
                  ? (e: KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onRowEnter?.(row);
                      }
                    }
                  : undefined
              }
              className={`h-11 ${interactive ? "cursor-pointer outline-offset-[-2px] hov:bg-surface-panel fv:outline-2 fv:outline-focus-ring" : ""} ${active ? "bg-surface-panel font-semibold" : ""} ${rowClassName ?? ""}`}
            >
              {columns.map((c) => (
                <td
                  key={c.id}
                  className={`px-2 py-2 align-middle ${align(c)} ${c.className ?? ""}`}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
