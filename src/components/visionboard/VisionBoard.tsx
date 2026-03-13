import React, { useMemo, useState } from 'react';
import { useNotes } from '@/context/NotesContextTypes';
import { useFileSystem } from '@/context/FileSystemContext';
import { VisionBoardItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface VisionBoardProps {
  id: string;
}

const VisionBoard: React.FC<VisionBoardProps> = ({ id }) => {
  const { visionBoards, updateVisionBoard, tags } = useNotes();
  const { status: fileSystemStatus, saveGeneratedImage } = useFileSystem();
  const visionBoard = visionBoards.find(vb => vb.id === id);

  const getReadableColorName = (hex: string, index: number) => {
    const normalized = hex.toLowerCase();
    const presetNames: Record<string, string> = {
      '#9b87f5': 'Purple',
      '#0ea5e9': 'Sky',
      '#10b981': 'Green',
      '#f97316': 'Orange',
      '#ec4899': 'Pink',
      '#6366f1': 'Indigo',
    };

    return presetNames[normalized] || `Color ${index + 1}`;
  };

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

  const colorOptions = useMemo(() => {
    const uniqueTagColors = Array.from(new Set(tags.map(tag => tag.color).filter(Boolean)));
    if (uniqueTagColors.length > 0) {
      return uniqueTagColors.slice(0, 10);
    }
    return ['#9b87f5', '#0EA5E9', '#10B981', '#F97316', '#EC4899', '#6366F1'];
  }, [tags]);

  if (!visionBoard) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Vision board not found</p>
      </div>
    );
  }

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

  return (
    <div
      className="h-full w-full relative overflow-auto bg-background"
      onMouseMove={handleMouseMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      style={{
        minHeight: '600px',
        minWidth: '100%',
        backgroundImage: `
          radial-gradient(circle at 20px 20px, hsl(var(--muted)) 1px, transparent 0),
          radial-gradient(circle at 80px 80px, hsl(var(--muted)) 1px, transparent 0)
        `,
        backgroundSize: '100px 100px',
        backgroundOpacity: '0.3',
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
        {visionBoard.items.map(item => (
          <div
            key={item.id}
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
                className="relative bg-card/80 backdrop-blur-sm p-3 rounded-lg shadow-md border"
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
                    {colorOptions.map((color, index) => (
                      <button
                        key={`${item.id}-${color}`}
                        type="button"
                        className="h-4 w-4 rounded-full border transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemAccentColor(item.id, color);
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        title={`Set color: ${getReadableColorName(color, index)}`}
                        aria-label={`Set color ${getReadableColorName(color, index)}`}
                        aria-pressed={(item.accentColor ?? colorOptions[0]) === color}
                      >
                        {(item.accentColor ?? colorOptions[0]) === color && (
                          <span className="block h-full w-full rounded-full ring-2 ring-foreground/60 ring-offset-1 ring-offset-background" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground min-w-[56px] text-right">
                    {getReadableColorName(item.accentColor ?? colorOptions[0], 0)}
                  </div>
                  <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                    <button
                      className="p-1 rounded-full hover:bg-secondary/50"
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
                      title={editingItemId === item.id ? 'Save note' : 'Edit note'}
                    >
                      {editingItemId === item.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      )}
                    </button>
                    {editingItemId === item.id && (
                      <button
                        className="p-1 rounded-full hover:bg-secondary/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditingTextItem();
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        title="Cancel editing"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                    <button
                      className="p-1 rounded-full hover:bg-secondary/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      title="Delete item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>

                {editingItemId === item.id ? (
                  <textarea
                    value={editingTextContent}
                    onChange={e => setEditingTextContent(e.target.value)}
                    className="w-full h-[calc(100%-2.25rem)] p-2 rounded bg-background/60 border border-border/40 resize-none"
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
                  className="absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize rounded-sm bg-background/70 border border-border/50"
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

                <div className="absolute top-1 left-1 flex items-center gap-1 rounded-full bg-card/80 px-1.5 py-1" onMouseDown={(e) => e.stopPropagation()}>
                  {colorOptions.map((color, index) => (
                    <button
                      key={`${item.id}-${color}`}
                      type="button"
                      className="h-3.5 w-3.5 rounded-full border border-white/40"
                      style={{ backgroundColor: color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemAccentColor(item.id, color);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      title={`Set color: ${getReadableColorName(color, index)}`}
                      aria-label={`Set color ${getReadableColorName(color, index)}`}
                      aria-pressed={(item.accentColor ?? colorOptions[0]) === color}
                    >
                      {(item.accentColor ?? colorOptions[0]) === color && (
                        <span className="block h-full w-full rounded-full ring-2 ring-foreground/70 ring-offset-1 ring-offset-card" />
                      )}
                    </button>
                  ))}
                </div>

                <div
                  className="absolute left-2 bottom-2 rounded px-1.5 py-0.5 text-[10px] bg-card/80 text-foreground/80"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {getReadableColorName(item.accentColor ?? colorOptions[0], 0)}
                </div>

                <button
                  className="absolute top-1 right-1 p-1 rounded-full bg-card/80 hover:bg-secondary/50"
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
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                    <button
                      className="p-1 rounded-full hover:bg-secondary/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (editingItemId === item.id) {
                          saveEditedTextItem(item.id);
                        } else {
                          startEditingTextItem(item);
                        }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title={editingItemId === item.id ? 'Save note' : 'Edit note'}
                    >
                      {editingItemId === item.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      )}
                    </button>
                    {editingItemId === item.id && (
                      <button
                        className="p-1 rounded-full hover:bg-secondary/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditingTextItem();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="Cancel editing"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                    <button
                      className="p-1 rounded-full hover:bg-secondary/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title="Delete item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>

                {editingItemId === item.id ? (
                  <textarea
                    value={editingTextContent}
                    onChange={e => setEditingTextContent(e.target.value)}
                    className="w-full h-[calc(100%-2.25rem)] p-2 rounded bg-background/60 border border-border/40 resize-none"
                    onMouseDown={(e) => e.stopPropagation()}
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
                  className="absolute right-1 bottom-1 w-4 h-4 cursor-nwse-resize rounded-sm bg-background/70 border border-border/50"
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

                <div className="absolute top-1 left-1 flex items-center gap-1 rounded-full bg-card/80 px-1.5 py-1" onMouseDown={(e) => e.stopPropagation()}>
                  {colorOptions.map(color => (
                    <button
                      key={`${item.id}-${color}`}
                      type="button"
                      className="h-3 w-3 rounded-full border border-white/40"
                      style={{ backgroundColor: color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemAccentColor(item.id, color);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      title="Set item color"
                    />
                  ))}
                </div>

                <button
                  className="absolute top-1 right-1 p-1 rounded-full bg-card/80 hover:bg-secondary/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(item.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
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
        ))}
      </div>

      {/* Modal for adding text */}
      {isAddingText && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="bg-card p-6 rounded-lg w-96 max-w-full">
            <h3 className="text-lg font-medium mb-4">Add Text Note</h3>
            <textarea
              value={newTextContent}
              onChange={e => setNewTextContent(e.target.value)}
              placeholder="Enter your text..."
              className="w-full h-32 p-2 bg-muted rounded-md mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingText(false)}>
                Cancel
              </Button>
              <Button onClick={addTextItem}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding image */}
      {isAddingImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="bg-card p-6 rounded-lg w-96 max-w-full">
            <h3 className="text-lg font-medium mb-4">Add Image</h3>
            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-2">Choose local image file</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileSelection}
                className="w-full text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Or paste an image URL below.</p>
            </div>
            <input
              type="text"
              value={newImageUrl}
              onChange={e => setNewImageUrl(e.target.value)}
              placeholder="Enter image URL..."
              className="w-full p-2 bg-muted rounded-md mb-4"
            />
            {newImageUrl && (
              <div className="mb-4">
                <img
                  src={newImageUrl}
                  alt="Preview"
                  className="max-h-40 rounded-md mx-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/150?text=Image+Error';
                  }}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsAddingImage(false);
                setNewImageFile(null);
              }}>
                Cancel
              </Button>
              <Button onClick={() => void addImageItem()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisionBoard;
