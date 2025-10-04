import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import VisionBoard from '@/components/visionboard/VisionBoard';
import { useNotes } from '@/context/NotesContextTypes';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ResizablePanel } from '@/components/ui/resizable';

const VisionBoardPage: React.FC = () => {
  const { visionBoards, addVisionBoard } = useNotes();
  const [selectedVisionBoardId, setSelectedVisionBoardId] = useState<string | null>(
    visionBoards.length > 0 ? visionBoards[0].id : null
  );
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const handleCreateVisionBoard = () => {
    if (!newBoardName.trim()) return;
    
    const newBoard = addVisionBoard({ name: newBoardName });
    setNewBoardName('');
    setIsCreatingBoard(false);
    setSelectedVisionBoardId(newBoard.id);
  };
  
  return (
    <AppLayout>
      <ResizablePanel defaultSize={100}>
        <div className="flex flex-col h-full w-full">
          <div className="flex-none p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-xl font-bold">Vision Boards</h2>
            <Button onClick={() => setIsCreatingBoard(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Vision Board
            </Button>
          </div>
          
          {visionBoards.length > 0 && (
            <div className="flex-none border-b border-border">
              <div className="flex overflow-x-auto py-2 px-4">
                {visionBoards.map(board => (
                  <button
                    key={board.id}
                    className={`px-4 py-2 rounded-md whitespace-nowrap mr-2 ${
                      selectedVisionBoardId === board.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/30 hover:bg-secondary/50'
                    }`}
                    onClick={() => setSelectedVisionBoardId(board.id)}
                  >
                    {board.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex-grow overflow-hidden relative">
            {selectedVisionBoardId ? (
              <div className="absolute inset-0 max-w-full overflow-auto">
                <VisionBoard id={selectedVisionBoardId} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">Create Your First Vision Board</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Collect and organize images, quotes, and ideas in a visual board.
                  Perfect for inspiration and creative projects.
                </p>
                <Button onClick={() => setIsCreatingBoard(true)}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Create Vision Board
                </Button>
              </div>
            )}
          </div>
          
          <Dialog open={isCreatingBoard} onOpenChange={setIsCreatingBoard}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Vision Board</DialogTitle>
              </DialogHeader>
              <Input
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Vision Board Name"
                className="mt-4"
              />
              <DialogFooter className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsCreatingBoard(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateVisionBoard}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ResizablePanel>
    </AppLayout>
  );
};

export default VisionBoardPage;
