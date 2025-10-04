import React, { useState } from 'react';
import { useNotes } from '@/context/NotesContextTypes';
import { VisionBoardItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';

interface VisionBoardProps {
  id: string;
}

const VisionBoard: React.FC<VisionBoardProps> = ({ id }) => {
  const { visionBoards, updateVisionBoard } = useNotes();
  const visionBoard = visionBoards.find(vb => vb.id === id);
  
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isAddingText, setIsAddingText] = useState(false);
  const [newTextContent, setNewTextContent] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  
  if (!visionBoard) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Vision board not found</p>
      </div>
    );
  }
  
  const handleDragStart = (e: React.MouseEvent, itemId: string, position: { x: number, y: number }) => {
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
    
    const newItems = visionBoard.items.map(item => {
      if (item.id === draggedItem) {
        return {
          ...item,
          position: {
            x: e.clientX - containerRect.left - dragOffset.x,
            y: e.clientY - containerRect.top - dragOffset.y
          }
        };
      }
      return item;
    });
    
    updateVisionBoard(visionBoard.id, { items: newItems });
  };
  
  const handleDragEnd = () => {
    setDraggedItem(null);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
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
      position: { x: 100, y: 100 }
    };
    
    updateVisionBoard(visionBoard.id, { 
      items: [...visionBoard.items, newItem]
    });
    
    setNewTextContent('');
    setIsAddingText(false);
  };
  
  const addImageItem = () => {
    if (!newImageUrl.trim()) return;
    
    const newItem: VisionBoardItem = {
      id: uuidv4(),
      type: 'image',
      content: newImageUrl,
      position: { x: 200, y: 100 },
      size: { width: 250, height: 150 }
    };
    
    updateVisionBoard(visionBoard.id, { 
      items: [...visionBoard.items, newItem]
    });
    
    setNewImageUrl('');
    setIsAddingImage(false);
  };
  
  const deleteItem = (itemId: string) => {
    updateVisionBoard(visionBoard.id, {
      items: visionBoard.items.filter(item => item.id !== itemId)
    });
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
              transition: draggedItem === item.id ? 'none' : 'all 0.2s ease-out'
            }}
            onMouseDown={(e) => handleDragStart(e, item.id, item.position)}
          >
            {item.type === 'text' ? (
              <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg shadow-md border border-border min-w-[200px] max-w-[400px]">
                <div className="flex justify-between items-center mb-2">
                  <div className="w-4" />
                  <button 
                    className="p-1 rounded-full hover:bg-secondary/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <p className="whitespace-pre-wrap">{item.content}</p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={item.content}
                  alt=""
                  style={{
                    width: item.size?.width ?? 200,
                    height: item.size?.height ?? 'auto'
                  }}
                  className="rounded-lg shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/200x150?text=Image+Error';
                  }}
                />
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
              <Button variant="outline" onClick={() => setIsAddingImage(false)}>
                Cancel
              </Button>
              <Button onClick={addImageItem}>
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
