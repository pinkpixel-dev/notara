import React, { useEffect, useMemo, useState } from 'react';
import { useNotes } from '@/context/NotesContextTypes';
import { useFileSystem } from '@/context/FileSystemContext';
import { VisionBoardItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import VisionBoardDialogs from './VisionBoardDialogs';
import VisionBoardItemCard from './VisionBoardItemCard';
import { toast } from '@/hooks/use-toast';

interface VisionBoardProps {
  id: string;
}

const VISION_BOARD_COLOR_FILTERS_KEY = 'notara-visionboard-color-filters';

const VisionBoard: React.FC<VisionBoardProps> = ({ id }) => {
  const { visionBoards, updateVisionBoard, tags } = useNotes();
  const { status: fileSystemStatus, saveGeneratedImage } = useFileSystem();
  const visionBoard = visionBoards.find(vb => vb.id === id);

  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizedItem, setResizedItem] = useState<{
    id: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [newTextContent, setNewTextContent] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTextContent, setEditingTextContent] = useState('');
  const [colorPickerItemId, setColorPickerItemId] = useState<string | null>(null);
  const [isColorFilterOpen, setIsColorFilterOpen] = useState(false);
  const [activeColorFilters, setActiveColorFilters] = useState<string[]>([]);

  const colorOptions = useMemo(() => {
    const basePalette = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
      '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78716c',
      '#6b7280', '#111827'
    ];

    const uniqueTagColors = Array.from(new Set(tags.map(tag => tag.color).filter(Boolean)));
    const merged = [...basePalette, ...uniqueTagColors].map(color => color.toLowerCase());
    return Array.from(new Set(merged));
  }, [tags]);

  if (!visionBoard) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Vision board not found</p>
      </div>
    );
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(VISION_BOARD_COLOR_FILTERS_KEY);
      if (!raw) {
        setActiveColorFilters([]);
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, string[]>;
      const boardFilters = Array.isArray(parsed?.[visionBoard.id])
        ? parsed[visionBoard.id].map(color => color.toLowerCase())
        : [];

      setActiveColorFilters(boardFilters);
    } catch (error) {
      console.warn('Failed to load Vision Board color filters', error);
      setActiveColorFilters([]);
    }
  }, [visionBoard.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(VISION_BOARD_COLOR_FILTERS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};

      parsed[visionBoard.id] = activeColorFilters;
      window.localStorage.setItem(VISION_BOARD_COLOR_FILTERS_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.warn('Failed to persist Vision Board color filters', error);
    }
  }, [activeColorFilters, visionBoard.id]);

  const getDefaultItemSize = (itemType: VisionBoardItem['type']) => {
    if (itemType === 'image') {
      return { width: 250, height: 150 };
    }
    return { width: 280, height: 180 };
  };

  const updateBoardItem = (itemId: string, updater: (item: VisionBoardItem) => VisionBoardItem) => {
    const updatedItems = visionBoard.items.map(item => (item.id === itemId ? updater(item) : item));
    updateVisionBoard(visionBoard.id, { items: updatedItems });
  };

  const handleDragStart = (e: React.MouseEvent, itemId: string, position: { x: number, y: number }) => {
    if (resizedItem || editingItemId === itemId) {
      return;
    }

    e.preventDefault(); // Prevent default drag behavior
    setDraggedItem(itemId);

    // Calculate the offset from the pointer to the item's top-left corner
    const itemElement = e.currentTarget as HTMLElement;
    const itemRect = itemElement.getBoundingClientRect();

    setDragOffset({
      x: e.clientX - itemRect.left,
      y: e.clientY - itemRect.top
    });
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!draggedItem) return;

    // Get the container's position to calculate relative coordinates
    const container = e.currentTarget as HTMLElement;
    const containerRect = container.getBoundingClientRect();

    updateBoardItem(draggedItem, item => ({
      ...item,
      position: {
        x: e.clientX - containerRect.left - dragOffset.x,
        y: e.clientY - containerRect.top - dragOffset.y
      }
    }));
  };

  const handleResizeStart = (e: React.MouseEvent, item: VisionBoardItem) => {
    e.preventDefault();
    e.stopPropagation();

    const defaultSize = getDefaultItemSize(item.type);
    setResizedItem({
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: item.size?.width ?? defaultSize.width,
      startHeight: item.size?.height ?? defaultSize.height,
    });
  };

  const handleResize = (e: React.MouseEvent) => {
    if (!resizedItem) {
      return;
    }

    const minWidth = 120;
    const minHeight = 90;
    const maxWidth = 1400;
    const maxHeight = 1400;

    const nextWidth = Math.min(
      maxWidth,
      Math.max(minWidth, resizedItem.startWidth + (e.clientX - resizedItem.startX))
    );
    const nextHeight = Math.min(
      maxHeight,
      Math.max(minHeight, resizedItem.startHeight + (e.clientY - resizedItem.startY))
    );

    updateBoardItem(resizedItem.id, item => ({
      ...item,
      size: {
        width: nextWidth,
        height: nextHeight,
      }
    }));
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setResizedItem(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (resizedItem) {
      handleResize(e);
      return;
    }

    if (draggedItem) {
      handleDrag(e);
    }
  };

  const addTextItem = () => {
    if (!newTextContent.trim()) return;

    const newItem: VisionBoardItem = {
      id: uuidv4(),
      type: 'text',
      content: newTextContent,
      position: { x: 100, y: 100 },
      size: { width: 280, height: 180 },
      accentColor: colorOptions[0],
    };

    updateVisionBoard(visionBoard.id, {
      items: [...visionBoard.items, newItem]
    });

    setNewTextContent('');
    setIsAddingText(false);
  };

  const addImageItem = async () => {
    if (!newImageUrl.trim()) return;

    if (newImageFile && fileSystemStatus === 'ready') {
      const safePrefix = (newImageFile.name || 'vision-board-image')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'vision-board-image';

      const savedPath = await saveGeneratedImage(newImageFile, {
        fileNamePrefix: safePrefix,
        mimeType: newImageFile.type,
      });

      if (savedPath) {
        toast({
          title: 'Image saved to folder',
          description: `Stored at ${savedPath}`,
        });
      }
    }

    const newItem: VisionBoardItem = {
      id: uuidv4(),
      type: 'image',
      content: newImageUrl,
      position: { x: 200, y: 100 },
      size: { width: 250, height: 150 },
      accentColor: colorOptions[0],
    };

    updateVisionBoard(visionBoard.id, {
      items: [...visionBoard.items, newItem]
    });

    setNewImageUrl('');
    setNewImageFile(null);
    setIsAddingImage(false);
  };

  const handleImageFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setNewImageFile(file);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    setNewImageUrl(dataUrl);
  };

  const deleteItem = (itemId: string) => {
    updateVisionBoard(visionBoard.id, {
      items: visionBoard.items.filter(item => item.id !== itemId)
    });
  };

  const startEditingTextItem = (item: VisionBoardItem) => {
    if (item.type !== 'text') {
      return;
    }

    setEditingItemId(item.id);
    setEditingTextContent(item.content);
  };

  const saveEditedTextItem = (itemId: string) => {
    const trimmedContent = editingTextContent.trim();
    if (!trimmedContent) {
      toast({
        title: 'Note cannot be empty',
        description: 'Please enter some text before saving.',
        variant: 'destructive',
      });
      return;
    }

    updateBoardItem(itemId, item => ({ ...item, content: trimmedContent }));
    setEditingItemId(null);
    setEditingTextContent('');
  };

  const cancelEditingTextItem = () => {
    setEditingItemId(null);
    setEditingTextContent('');
  };

  const setItemAccentColor = (itemId: string, accentColor: string) => {
    updateBoardItem(itemId, item => ({ ...item, accentColor }));
  };

  const toggleColorFilter = (color: string) => {
    setActiveColorFilters(prev =>
      prev.includes(color) ? prev.filter(item => item !== color) : [...prev, color]
    );
  };

  const visibleItems = visionBoard.items.filter(item => {
    if (!activeColorFilters.length) {
      return true;
    }

    const itemColor = (item.accentColor ?? colorOptions[0]).toLowerCase();
    return activeColorFilters.includes(itemColor);
  });

  return (
    <div
      className="surface-pinboard h-full w-full relative overflow-auto"
      onMouseMove={handleMouseMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      style={{
        minHeight: '600px',
        minWidth: '100%',
        userSelect: draggedItem ? 'none' : 'auto',
        cursor: draggedItem ? 'grabbing' : 'default'
      }}
    >
      {/* Content container with min-width to ensure space for items */}
      <div className="relative" style={{ minWidth: '100%', minHeight: '100%' }}>

        {/* Board title */}
        <div className="absolute top-4 left-4 z-10">
          <h2 className="text-2xl font-bold">{visionBoard.name}</h2>
        </div>

        {/* Control panel */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setActiveColorFilters([])}
            className="gap-2"
            title="Reset color filters"
            disabled={!activeColorFilters.length}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg>
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsColorFilterOpen(true)}
            className="gap-2"
            title="Filter by color"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="13.5" r="2.5"/><circle cx="12.5" cy="17.5" r="2.5"/></svg>
            Filter
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddingText(true)}
            className="gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
            Add Text
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddingImage(true)}
            className="gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Add Image
          </Button>
        </div>

        {/* Vision board items */}
        {visibleItems.map(item => (
          <VisionBoardItemCard
            key={item.id}
            item={item}
            draggedItem={draggedItem}
            editingItemId={editingItemId}
            editingTextContent={editingTextContent}
            setEditingTextContent={setEditingTextContent}
            colorOptions={colorOptions}
            handleDragStart={handleDragStart}
            handleResizeStart={handleResizeStart}
            startEditingTextItem={startEditingTextItem}
            saveEditedTextItem={saveEditedTextItem}
            cancelEditingTextItem={cancelEditingTextItem}
            deleteItem={deleteItem}
            setColorPickerItemId={setColorPickerItemId}
          />
        ))}
      </div>

      <VisionBoardDialogs
        isAddingText={isAddingText}
        setIsAddingText={setIsAddingText}
        newTextContent={newTextContent}
        setNewTextContent={setNewTextContent}
        onAddTextItem={addTextItem}
        isAddingImage={isAddingImage}
        setIsAddingImage={setIsAddingImage}
        newImageUrl={newImageUrl}
        setNewImageUrl={setNewImageUrl}
        setNewImageFile={setNewImageFile}
        onImageFileSelection={handleImageFileSelection}
        onAddImageItem={() => void addImageItem()}
        colorOptions={colorOptions}
        items={visionBoard.items}
        colorPickerItemId={colorPickerItemId}
        setColorPickerItemId={setColorPickerItemId}
        onSetItemAccentColor={setItemAccentColor}
        isColorFilterOpen={isColorFilterOpen}
        setIsColorFilterOpen={setIsColorFilterOpen}
        activeColorFilters={activeColorFilters}
        setActiveColorFilters={setActiveColorFilters}
        onToggleColorFilter={toggleColorFilter}
      />
    </div>
  );
};

export default VisionBoard;
