"use client";

import { useCallback, useRef } from "react";
import type { KeyboardEvent } from "react";

/**
 * Weight cells of a usage row that can be reached with the arrow keys.
 *
 * The Chemical picker is deliberately left out: it is a native `<select>`,
 * where the arrow keys already walk through the options.
 */
export const navigableFields = [
  "startWeight",
  "before",
  "after",
  "endWeight",
] as const;

export type NavigableField = (typeof navigableFields)[number];

function cellKey(rowId: string, field: NavigableField): string {
  return `${rowId}::${field}`;
}

/**
 * Lets the operator walk the weight cells with the arrow keys.
 *
 * Left and Right move within a row, Up and Down move to the same cell of the
 * neighbouring row. Moving onto a cell selects its contents, so the next
 * keystroke replaces the value instead of appending to it.
 */
export function useCellNavigation(rowIds: readonly string[]) {
  const cells = useRef(new Map<string, HTMLInputElement>());
  const registrars = useRef(
    new Map<string, (element: HTMLInputElement | null) => void>(),
  );
  const rowIdsRef = useRef(rowIds);
  rowIdsRef.current = rowIds;

  /**
   * Ref callback for a weight cell.
   *
   * The callback is cached per cell so the same function identity is handed
   * out on every render; React would otherwise detach and reattach the ref
   * on each pass.
   */
  const register = useCallback((rowId: string, field: NavigableField) => {
    const key = cellKey(rowId, field);
    let registrar = registrars.current.get(key);

    if (!registrar) {
      registrar = (element: HTMLInputElement | null) => {
        if (element) cells.current.set(key, element);
        else cells.current.delete(key);
      };
      registrars.current.set(key, registrar);
    }

    return registrar;
  }, []);

  const focusCell = useCallback((rowId: string, field: NavigableField) => {
    const element = cells.current.get(cellKey(rowId, field));
    if (!element) return;

    element.focus();
    element.select();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const target = event.target as HTMLInputElement | null;
      if (!target) return;

      // A modified arrow key is a text-editing command (extend the selection,
      // jump by word), so it is left to the browser.
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      const rowId = target.dataset.navRow;
      const field = target.dataset.navField as NavigableField | undefined;
      if (!rowId || !field) return;

      const rows = rowIdsRef.current;
      const rowIndex = rows.indexOf(rowId);
      if (rowIndex === -1) return;

      const fieldIndex = navigableFields.indexOf(field);
      if (fieldIndex === -1) return;

      let nextRow = rowIndex;
      let nextField = fieldIndex;

      switch (event.key) {
        case "ArrowRight":
          nextField += 1;
          break;
        case "ArrowLeft":
          nextField -= 1;
          break;
        case "ArrowDown":
          nextRow += 1;
          break;
        case "ArrowUp":
          nextRow -= 1;
          break;
        default:
          return;
      }

      // Keep the movement inside the table.
      if (nextRow < 0 || nextRow >= rows.length) return;
      if (nextField < 0 || nextField >= navigableFields.length) return;

      event.preventDefault();
      focusCell(rows[nextRow], navigableFields[nextField]);
    },
    [focusCell],
  );

  return { register, handleKeyDown };
}