import React from 'react';
import { Button } from '@/components/ui/button';
import type { VisionBoardItem } from '@/types';

interface VisionBoardDialogsProps {
  isAddingText: boolean;
  setIsAddingText: (open: boolean) => void;
  newTextContent: string;
  setNewTextContent: (value: string) => void;
  onAddTextItem: () => void;

  isAddingImage: boolean;
  setIsAddingImage: (open: boolean) => void;
  newImageUrl: string;
  setNewImageUrl: (value: string) => void;
  setNewImageFile: (file: File | null) => void;
  onImageFileSelection: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddImageItem: () => void;

  colorOptions: string[];
  items: VisionBoardItem[];
  colorPickerItemId: string | null;
  setColorPickerItemId: (id: string | null) => void;
  onSetItemAccentColor: (itemId: string, color: string) => void;

  isColorFilterOpen: boolean;
  setIsColorFilterOpen: (open: boolean) => void;
  activeColorFilters: string[];
  setActiveColorFilters: (colors: string[]) => void;
  onToggleColorFilter: (color: string) => void;
}

const overlay = 'absolute inset-0 flex items-center justify-center bg-black/50';

/**
 * The four vision board overlays: add text, add image, item color, and the
 * board-wide color filter.
 */
const VisionBoardDialogs: React.FC<VisionBoardDialogsProps> = ({
  isAddingText, setIsAddingText, newTextContent, setNewTextContent, onAddTextItem,
  isAddingImage, setIsAddingImage, newImageUrl, setNewImageUrl, setNewImageFile,
  onImageFileSelection, onAddImageItem,
  colorOptions, items, colorPickerItemId, setColorPickerItemId, onSetItemAccentColor,
  isColorFilterOpen, setIsColorFilterOpen, activeColorFilters, setActiveColorFilters,
  onToggleColorFilter,
}) => (
  <>
    {isAddingText && (
      <div className={`${overlay} z-20`} role="dialog" aria-modal="true" aria-label="Add text note">
        <div className="w-96 max-w-full rounded-lg bg-card p-6">
          <h3 className="mb-4 text-lg font-medium">Add Text Note</h3>
          <label htmlFor="vb-text" className="sr-only">Text</label>
          <textarea
            id="vb-text"
            value={newTextContent}
            onChange={(e) => setNewTextContent(e.target.value)}
            placeholder="Enter your text..."
            className="mb-4 h-32 w-full rounded-md surface-input border border-border p-2"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddingText(false)}>Cancel</Button>
            <Button onClick={onAddTextItem} disabled={!newTextContent.trim()}>Add</Button>
          </div>
        </div>
      </div>
    )}

    {isAddingImage && (
      <div className={`${overlay} z-20`} role="dialog" aria-modal="true" aria-label="Add image">
        <div className="w-96 max-w-full rounded-lg bg-card p-6">
          <h3 className="mb-4 text-lg font-medium">Add Image</h3>
          <div className="mb-3">
            <label htmlFor="vb-image-file" className="mb-2 block text-xs text-muted-foreground">
              Choose local image file
            </label>
            <input
              id="vb-image-file"
              type="file"
              accept="image/*"
              onChange={onImageFileSelection}
              className="w-full text-sm"
            />
            <p className="mt-1 text-xs text-muted-foreground">Or paste an image URL below.</p>
          </div>
          <label htmlFor="vb-image-url" className="sr-only">Image URL</label>
          <input
            id="vb-image-url"
            type="text"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="Enter image URL..."
            className="mb-4 w-full rounded-md surface-input border border-border p-2"
          />
          {newImageUrl && (
            <div className="mb-4">
              <img src={newImageUrl} alt="Preview" className="mx-auto max-h-40 rounded-md" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingImage(false);
                setNewImageFile(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={onAddImageItem}>Add</Button>
          </div>
        </div>
      </div>
    )}

    {colorPickerItemId && (
      <div className={`${overlay} z-30`} role="dialog" aria-modal="true" aria-label="Set item color">
        <div className="w-[28rem] max-w-[calc(100%-2rem)] rounded-lg bg-card p-6">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {colorOptions.map((color) => {
              const active =
                (items.find(item => item.id === colorPickerItemId)?.accentColor ?? colorOptions[0])
                  .toLowerCase() === color;

              return (
                <button
                  key={`picker-${color}`}
                  type="button"
                  className="h-9 w-9 rounded-full border border-white/40 transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => onSetItemAccentColor(colorPickerItemId, color)}
                  aria-pressed={active}
                  aria-label={`Set item color to ${color}`}
                >
                  {active && (
                    <span className="block h-full w-full rounded-full ring-2 ring-foreground ring-offset-1 ring-offset-card" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setColorPickerItemId(null)}>Done</Button>
          </div>
        </div>
      </div>
    )}

    {isColorFilterOpen && (
      <div className={`${overlay} z-30`} role="dialog" aria-modal="true" aria-label="Filter by color">
        <div className="w-[32rem] max-w-[calc(100%-2rem)] rounded-lg bg-card p-6">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {colorOptions.map((color) => {
              const active = activeColorFilters.includes(color);

              return (
                <button
                  key={`filter-${color}`}
                  type="button"
                  className="h-9 w-9 rounded-full border border-white/40 transition-colors"
                  style={{ backgroundColor: color }}
                  onClick={() => onToggleColorFilter(color)}
                  aria-pressed={active}
                  aria-label={`Filter by color ${color}`}
                >
                  {active && (
                    <span className="block h-full w-full rounded-full ring-2 ring-foreground ring-offset-1 ring-offset-card" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-between gap-2">
            <Button variant="outline" onClick={() => setActiveColorFilters([])}>Show All</Button>
            <Button onClick={() => setIsColorFilterOpen(false)}>Done</Button>
          </div>
        </div>
      </div>
    )}
  </>
);

export default VisionBoardDialogs;
