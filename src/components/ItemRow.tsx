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
    <li data-testid="item-row" className="group relative overflow-hidden rounded-[24px]">
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
          className={`flex min-h-14 flex-1 select-none items-center gap-3 rounded-l-[24px] border border-r-0 px-4 py-3 text-left transition-[background-color,transform,opacity] duration-150 ${
            item.isChecked
              ? 'border-ink/[0.06] bg-blush-50/70 dark:border-white/10 dark:bg-blush-950/20'
              : 'border-ink/[0.06] bg-white/75 hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:hover:bg-white/[0.09]'
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
                ? 'border-ink bg-ink text-paper dark:border-paper dark:bg-paper dark:text-ink'
                : 'border-ink/20 bg-white/60 dark:border-white/20 dark:bg-white/10'
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
                    ? 'text-ink/45 line-through decoration-ink/30 dark:text-paper/40 dark:decoration-paper/30'
                    : 'text-ink dark:text-paper'
                }`}
              >
                {item.displayName}
              </span>
              {item.quantity ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    item.isChecked
                      ? 'bg-ink/5 text-ink/45 dark:bg-paper/10 dark:text-paper/45'
                      : 'bg-mint-100 text-ink dark:bg-mint-950 dark:text-mint-100'
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
                    ? 'text-ink/35 dark:text-paper/35'
                    : 'text-ink/45 dark:text-paper/45'
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
          className={`flex min-h-14 w-12 shrink-0 items-center justify-center rounded-r-[24px] border border-l-0 border-ink/[0.06] text-ink/30 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:text-red-700 dark:border-white/10 dark:text-paper/30 dark:hover:bg-red-950/40 dark:hover:text-red-300 ${
            item.isChecked
              ? 'bg-blush-50/70 dark:bg-blush-950/20'
              : 'bg-white/75 dark:bg-white/[0.055]'
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
