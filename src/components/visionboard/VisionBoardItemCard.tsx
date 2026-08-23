import React from 'react';
import type { VisionBoardItem } from '@/types';

interface VisionBoardItemCardProps {
  item: VisionBoardItem;
  draggedItem: string | null;
  editingItemId: string | null;
  editingTextContent: string;
  setEditingTextContent: (value: string) => void;
  colorOptions: string[];
  handleDragStart: (e: React.MouseEvent, itemId: string, position: { x: number; y: number }) => void;
  handleResizeStart: (e: React.MouseEvent, item: VisionBoardItem) => void;
  startEditingTextItem: (item: VisionBoardItem) => void;
  saveEditedTextItem: (itemId: string) => void;
  cancelEditingTextItem: () => void;
  deleteItem: (itemId: string) => void;
  setColorPickerItemId: (id: string | null) => void;
}

/** One placed card on the pinboard: text or image, with its own controls. */
const VisionBoardItemCard: React.FC<VisionBoardItemCardProps> = ({
  item,
  draggedItem,
  editingItemId,
  editingTextContent,
  setEditingTextContent,
  colorOptions,
  handleDragStart,
  handleResizeStart,
  startEditingTextItem,
  saveEditedTextItem,
  cancelEditingTextItem,
  deleteItem,
  setColorPickerItemId,
}) => (
    <div
        className={`absolute transition-none ${
        draggedItem === item.id
          ? 'z-10 cursor-grabbing opacity-90 scale-105'
          : 'z-0 cursor-grab hover:shadow-lg'
      }`}
      style={{
        left: `${item.position.x}px`,
        top: `${item.position.y}px`,
        userSelect: 'none',
        transform: draggedItem === item.id ? 'scale(1.05)' : 'scale(1)',
        transition: draggedItem === item.id ? 'none' : 'all 0.2s ease-out',
      }}
      onMouseDown={(e) => handleDragStart(e, item.id, item.position)}
    >
      {item.type === 'text' ? (
        <div
          className="relative surface-elevated p-3 rounded-lg border border-border"
          style={{
            width: item.size?.width ?? 280,
            height: item.size?.height ?? 180,
            borderColor: item.accentColor ?? 'hsl(var(--border))',
            boxShadow: item.accentColor
              ? `0 0 0 2px ${item.accentColor}40, 0 8px 20px -12px ${item.accentColor}`
              : undefined,
          }}
        >
          <div className="flex justify-between items-center mb-2 gap-2">
            <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-secondary/50"
                onClick={(e) => {
                  e.stopPropagation();
                  setColorPickerItemId(item.id);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                aria-label="Set item color"
              >
                <span
                  className="block h-3 w-3 rounded-full border border-white/50"
                  style={{ backgroundColor: item.accentColor ?? colorOptions[0] }}
                />
              </button>
              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-secondary/50"
                onClick={(e) => {
                  e.stopPropagation();
                  if (editingItemId === item.id) {
                    saveEditedTextItem(item.id);
                  } else {
                    startEditingTextItem(item);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                aria-label={editingItemId === item.id ? 'Save note' : 'Edit note'}
              >
                {editingItemId === item.id ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
                )}
              </button>
              {editingItemId === item.id && (
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-secondary/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelEditingTextItem();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  aria-label="Cancel editing"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-secondary/50"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem(item.id);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                aria-label="Delete item"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {editingItemId === item.id ? (
            <textarea
              value={editingTextContent}
              onChange={e => setEditingTextContent(e.target.value)}
              className="w-full h-[calc(100%-2.25rem)] p-2 rounded surface-input border border-border resize-none"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          ) : (
            <p
              className="whitespace-pre-wrap overflow-auto h-[calc(100%-2.25rem)]"
              onDoubleClick={() => startEditingTextItem(item)}
            >
              {item.content}
            </p>
          )}

          <div
            className="absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize rounded-sm surface-elevated border border-border"
            onMouseDown={(e) => handleResizeStart(e, item)}
            title="Resize"
          />
        </div>
      ) : (
        <div
          className="relative rounded-lg overflow-hidden border"
          style={{
            width: item.size?.width ?? 250,
            height: item.size?.height ?? 150,
            borderColor: item.accentColor ?? 'hsl(var(--border))',
            boxShadow: item.accentColor
              ? `0 0 0 2px ${item.accentColor}40, 0 10px 24px -14px ${item.accentColor}`
              : undefined,
          }}
        >
          <img
            src={item.content}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            className="shadow-lg"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/200x150?text=Image+Error';
            }}
          />

          <button
            className="absolute top-1 left-1 flex h-8 w-8 items-center justify-center rounded-full bg-card/80 hover:bg-secondary/50"
            onClick={(e) => {
              e.stopPropagation();
              setColorPickerItemId(item.id);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            aria-label="Set item color"
          >
            <span
              className="block h-3.5 w-3.5 rounded-full border border-white/50"
              style={{ backgroundColor: item.accentColor ?? colorOptions[0] }}
            />
          </button>

          <button
            type="button"
            aria-label="Delete board item"
            className="absolute top-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 hover:bg-secondary/50"
            onClick={(e) => {
              e.stopPropagation();
              deleteItem(item.id);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div
            className="absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize rounded-sm bg-card/80 border border-border/50"
            onMouseDown={(e) => handleResizeStart(e, item)}
            title="Resize"
          />
        </div>
      )}
    </div>
);

export default VisionBoardItemCard;
