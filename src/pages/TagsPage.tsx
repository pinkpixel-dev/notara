import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
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
import { NoteTag, Note } from '@/types';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

const TagsPage: React.FC = () => {
  const { tags, notes, addTag, updateTag, deleteTag, setActiveNote } = useNotes();
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#9b87f5');
  const [editingTag, setEditingTag] = useState<NoteTag | null>(null);
  
  const navigate = useNavigate();
  
  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    
    addTag({
      name: newTagName,
      color: newTagColor
    });
    
    setNewTagName('');
    setNewTagColor('#9b87f5');
    setIsCreatingTag(false);
  };
  
  const handleEditTag = () => {
    if (!editingTag || !newTagName.trim()) return;
    
    updateTag(editingTag.id, {
      name: newTagName,
      color: newTagColor
    });
    
    setNewTagName('');
    setNewTagColor('#9b87f5');
    setIsEditingTag(false);
    setEditingTag(null);
  };
  
  const openEditDialog = (tag: NoteTag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setNewTagColor(tag.color);
    setIsEditingTag(true);
  };
  
  const handleDeleteTag = (id: string) => {
    if (confirm('Are you sure you want to delete this tag? It will be removed from all notes.')) {
      deleteTag(id);
    }
  };
  
  const getNotesWithTag = (tagId: string): Note[] => {
    return notes.filter(note => note.tags.some(tag => tag.id === tagId));
  };
  
  const handleNoteClick = (note: Note) => {
    setActiveNote(note);
    navigate('/');
  };
  
  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">Tags</h2>
          <Button onClick={() => setIsCreatingTag(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Tag
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 bg-transparent">
          {tags.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <p className="text-muted-foreground mb-4">No tags created yet</p>
              <Button onClick={() => setIsCreatingTag(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create First Tag
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tags.map(tag => {
                const notesWithTag = getNotesWithTag(tag.id);
                
                return (
                  <div 
                    key={tag.id} 
                    className="bg-card border border-border rounded-lg overflow-hidden"
                  >
                    <div 
                      className="p-4 flex justify-between items-center"
                      style={{ backgroundColor: `${tag.color}20` }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <h3 className="font-medium">{tag.name}</h3>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="p-2 rounded-md hover:bg-secondary/50 transition-colors"
                          onClick={() => openEditDialog(tag)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          className="p-2 rounded-md hover:bg-secondary/50 transition-colors"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm text-muted-foreground mb-3">
                        {notesWithTag.length} note{notesWithTag.length !== 1 ? 's' : ''}
                      </h4>
                      <div className="space-y-2">
                        {notesWithTag.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No notes with this tag</p>
                        ) : (
                          notesWithTag.slice(0, 3).map(note => (
                            <div 
                              key={note.id} 
                              className="flex justify-between items-center p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                              onClick={() => handleNoteClick(note)}
                            >
                              <span className="truncate">{note.title}</span>
                            </div>
                          ))
                        )}
                        {notesWithTag.length > 3 && (
                          <p className="text-xs text-muted-foreground text-right pt-1">
                            +{notesWithTag.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Create Tag Dialog */}
        <Dialog open={isCreatingTag} onOpenChange={setIsCreatingTag}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tag Name</Label>
                <Input
                  id="name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Tag Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-10 h-10 rounded-md cursor-pointer"
                  />
                  <Input
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatingTag(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTag}>
                Create Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Tag Dialog */}
        <Dialog open={isEditingTag} onOpenChange={setIsEditingTag}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Tag Name</Label>
                <Input
                  id="edit-name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-color">Tag Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="edit-color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-10 h-10 rounded-md cursor-pointer"
                  />
                  <Input
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditingTag(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditTag}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default TagsPage;
