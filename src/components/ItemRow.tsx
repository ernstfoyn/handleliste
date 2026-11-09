import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Item } from '../lib/types';

const LONG_PRESS_MS = 550;
const SWIPE_TRIGGER = 56;
const MAX_SWIPE = 88;

export function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef(0);
  const longPressTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const gesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    horizontal: boolean;
    moved: boolean;
  } | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => clearLongPress, []);

  const begin = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    suppressClick.current = false;
    dragRef.current = 0;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      horizontal: false,
      moved: false,
    };
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      suppressClick.current = true;
      setDragX(0);
      onDelete();
    }, LONG_PRESS_MS);
  };

  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;

    if (!current.moved && Math.hypot(dx, dy) > 8) {
      current.moved = true;
      clearLongPress();
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    if (Math.abs(dx) > Math.abs(dy) || current.horizontal) {
      if (Math.abs(dx) > 8) {
        current.horizontal = true;
        dragRef.current = Math.max(-MAX_SWIPE, Math.min(0, dx));
        setDragX(dragRef.current);
      }
    }
  };

  const end = () => {
    clearLongPress();
    const current = gesture.current;
    gesture.current = null;

    if (current?.horizontal && dragRef.current <= -SWIPE_TRIGGER) {
      suppressClick.current = true;
      dragRef.current = 0;
      setDragX(0);
      onDelete();
      return;
    }
    dragRef.current = 0;
    setDragX(0);
  };

  const cancel = () => {
    clearLongPress();
    gesture.current = null;
    dragRef.current = 0;
    setDragX(0);
  };

  return (
    <li data-testid="item-row" className="group relative overflow-hidden rounded-2xl">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-red-600 text-white transition-opacity"
        style={{ opacity: dragX < 0 ? 1 : 0 }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="relative z-10 flex items-stretch">
        <button
          type="button"
          className={`flex min-h-14 flex-1 select-none items-center gap-3 rounded-l-2xl border border-r-0 px-3.5 py-3 text-left transition-[background-color,transform,opacity] duration-150 ${
            item.isChecked
              ? 'border-stone-200/70 bg-stone-100 dark:border-stone-800 dark:bg-stone-900'
              : 'border-stone-200/80 bg-white hover:bg-brand-50/40 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/70'
          }`}
          style={{ transform: `translateX(${dragX}px)`, touchAction: 'pan-y' }}
          data-item-toggle-id={item.id}
          aria-pressed={item.isChecked}
          aria-label={`Merk ${item.displayName}${
            item.quantity || item.note
              ? `, ${[item.quantity, item.note].filter(Boolean).join(', ')}`
              : ''
          } som ${item.isChecked ? 'ikke kjøpt' : 'kjøpt'}`}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            onToggle();
          }}
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={cancel}
          onPointerLeave={cancel}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              item.isChecked
                ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-brand-950'
                : 'border-stone-300 bg-white dark:border-stone-600 dark:bg-stone-900'
            }`}
            aria-hidden="true"
          >
            {item.isChecked ? (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M5 12.5l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={`break-words text-[15px] font-medium leading-snug ${
                  item.isChecked
                    ? 'text-stone-600 line-through decoration-stone-400/80 dark:text-stone-400 dark:decoration-stone-500'
                    : 'text-stone-900 dark:text-stone-50'
                }`}
              >
                {item.displayName}
              </span>
              {item.quantity ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    item.isChecked
                      ? 'bg-stone-200/80 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                      : 'bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-200'
                  }`}
                >
                  {item.quantity}
                </span>
              ) : null}
            </span>
            {item.note ? (
              <span
                className={`mt-0.5 block text-xs ${
                  item.isChecked
                    ? 'text-stone-600 dark:text-stone-400'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                {item.note}
              </span>
            ) : null}
          </span>
        </button>

        <button
          type="button"
          data-ignore-row="true"
          className={`flex min-h-14 w-12 shrink-0 items-center justify-center rounded-r-2xl border border-l-0 border-stone-200/80 text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:text-red-700 dark:border-stone-800 dark:hover:bg-red-950/40 dark:hover:text-red-300 ${
            item.isChecked ? 'bg-stone-100 dark:bg-stone-900' : 'bg-white dark:bg-stone-900'
          }`}
          onClick={onDelete}
          aria-label={`Slett ${item.displayName}`}
          title="Slett vare"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            aria-hidden="true"
          >
            <path
              d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13M10 11v5M14 11v5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </li>
  );
}
