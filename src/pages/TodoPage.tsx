import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useTodo } from '@/context/TodoContextTypes';
import { format, parseISO, parse } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Edit3, Trash2, ListChecks, ChevronDown, ChevronRight, 
  Plus, Calendar, Check, CheckCircle2, CircleDashed, Clock
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidv4 } from 'uuid';
import type { TodoItem, TodoList } from '@/types';
import { ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const TodoPage: React.FC = () => {
  const { todoLists, addTodoList, updateTodoList, deleteTodoList, addTodoItem, updateTodoItem, deleteTodoItem } = useTodo();
  const [isAddingList, setIsAddingList] = useState(false);
  const [isEditingList, setIsEditingList] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isManagingItems, setIsManagingItems] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newItemContent, setNewItemContent] = useState('');
  const [newItemTime, setNewItemTime] = useState('12:00');
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);
  const [subInputs, setSubInputs] = useState<Record<string, string>>({});
  const [starField, setStarField] = useState<React.ReactNode[]>([]);
  const [use12HourFormat, setUse12HourFormat] = useState(true);
  const [showSubInputs, setShowSubInputs] = useState<Record<string, boolean>>({});

  // Generate random stars for the background
  useEffect(() => {
    const stars = [];
    const count = 50;
    
    for (let i = 0; i < count; i++) {
      const size = Math.random() > 0.8 ? 'star-large' : Math.random() > 0.5 ? 'star-medium' : 'star-small';
      const delay = `${Math.random() * 5}s`;
      
      stars.push(
        <div 
          key={i}
          className={`star ${size}`}
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: delay,
          }}
        />
      );
    }
    
    setStarField(stars);
  }, []);

  // Select the first list when the component mounts if there are any lists
  useEffect(() => {
    if (todoLists.length > 0 && !selectedListId) {
      setSelectedListId(todoLists[0].id);
    }
  }, [todoLists, selectedListId]);

  const openEditDialog = (list: { id: string; title: string; date: string }) => {
    setEditingListId(list.id);
    setNewTitle(list.title);
    setNewDate(list.date);
    setIsEditingList(true);
  };

  const handleEditList = () => {
    if (!editingListId || !newTitle.trim()) return;
    updateTodoList(editingListId, { title: newTitle, date: newDate });
    setIsEditingList(false);
    setEditingListId(null);
    setNewTitle('');
    setNewDate(new Date().toISOString().split('T')[0]);
  };

  const handleDeleteList = (id: string) => {
    if (window.confirm('Are you sure you want to delete this list?')) {
      deleteTodoList(id);
      if (selectedListId === id) {
        setSelectedListId(todoLists.find(list => list.id !== id)?.id || null);
      }
    }
  };

  const handleAddItem = () => {
    if (!selectedListId || !newItemContent.trim()) return;
    addTodoItem(selectedListId, { content: newItemContent, time: newItemTime, checked: false });
    setNewItemContent('');
    setNewItemTime('12:00');
    setIsManagingItems(false);
  };

  const openEditItemDialog = (item: TodoItem) => {
    setEditingItemId(item.id);
    setNewItemContent(item.content);
    setNewItemTime(item.time);
    setIsEditingItem(true);
  };

  const handleEditItem = () => {
    if (!selectedListId || !editingItemId) return;
    updateTodoItem(selectedListId, editingItemId, { content: newItemContent, time: newItemTime });
    setIsEditingItem(false);
    setEditingItemId(null);
    setNewItemContent('');
    setNewItemTime('12:00');
  };

  const handleDeleteItem = (itemId: string) => {
    if (selectedListId && window.confirm('Delete this item?')) {
      deleteTodoItem(selectedListId, itemId);
    }
  };

  const toggleExpandItem = (itemId: string) => {
    setExpandedItemIds(prev => prev.includes(itemId)
      ? prev.filter(id2 => id2 !== itemId)
      : [...prev, itemId]
    );
  };

  const handleShowSubInput = (itemId: string, show: boolean) => {
    setShowSubInputs(prev => ({ ...prev, [itemId]: show }));
    if (show) {
      // Also expand the item when showing sub-input
      if (!expandedItemIds.includes(itemId)) {
        toggleExpandItem(itemId);
      }
      
      // Focus the input field after a short delay to allow rendering
      setTimeout(() => {
        const inputElement = document.getElementById(`sub-input-${itemId}`);
        if (inputElement) inputElement.focus();
      }, 100);
    }
  };

  const handleAddSubItem = (listId: string, itemId: string) => {
    const content = subInputs[itemId]?.trim();
    if (!content) return;
    const list = todoLists.find(l => l.id === listId);
    const item = list?.items.find(i => i.id === itemId);
    if (!item) return;
    const newSub = { id: uuidv4(), content, checked: false, time: '', subItems: [] };
    const updatedSubs = [...(item.subItems || []), newSub];
    updateTodoItem(listId, itemId, { subItems: updatedSubs });
    setSubInputs(prev => ({ ...prev, [itemId]: '' }));
  };

  const handleDeleteSubItem = (listId: string, itemId: string, subId: string) => {
    const list = todoLists.find(l => l.id === listId);
    const item = list?.items.find(i => i.id === itemId);
    if (!item) return;
    const updatedSubs = (item.subItems || []).filter(s => s.id !== subId);
    updateTodoItem(listId, itemId, { subItems: updatedSubs });
  };

  // Format time to 12 or 24 hour format
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    try {
      if (use12HourFormat) {
        // Convert 24h format to 12h format
        const timeDate = parse(timeString, 'HH:mm', new Date());
        return format(timeDate, 'h:mm a');
      } else {
        // Return as is (already in 24h format)
        return timeString;
      }
    } catch (error) {
      return timeString; // If parsing fails, return original
    }
  };

  // Sort items by time
  const getSortedItems = (items: TodoItem[]) => {
    return [...items].sort((a, b) => {
      // If items don't have time, put them at the end
      if (!a.time) return 1;
      if (!b.time) return -1;
      
      // Compare times
      return a.time.localeCompare(b.time);
    });
  };

  const selectedList = todoLists.find(list => list.id === selectedListId);
  const sortedItems = selectedList ? getSortedItems(selectedList.items) : [];

  return (
    <AppLayout>
      <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
        <div className="h-full flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-border/30">
            <h2 className="text-xl font-bold">To-Do Lists</h2>
            <Button onClick={() => setIsAddingList(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add List
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            {todoLists.length === 0 ? (
              <div className="p-4 text-muted-foreground">
                No to-do lists yet. Click the "Add List" button to create one.
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {todoLists.map(list => (
                  <div 
                    key={list.id} 
                    className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors ${
                      selectedListId === list.id 
                        ? 'bg-primary/20 text-primary-foreground' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedListId(list.id)}
                  >
                    <div>
                      <div className="font-medium">{list.title}</div>
                      <div className="text-xs flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(list.date), 'MMM d, yyyy')}
                        <span className="mx-1">•</span>
                        <CheckCircle2 className="h-3 w-3" />
                        {list.items.filter(item => item.checked).length}/{list.items.length}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openEditDialog(list); }}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive/80" 
                        onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
      
      <ResizableHandle withHandle className="bg-border/30 hover:bg-primary/50 transition-colors" />
      
      <ResizablePanel defaultSize={75}>
        <div className="h-full border-l border-border/30 relative">
          {starField}
          
          {/* Right panel content */}
          {selectedList ? (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-border/30">
                <div>
                  <h2 className="text-xl font-bold">{selectedList.title}</h2>
                  <div className="text-sm text-muted-foreground">
                    {format(parseISO(selectedList.date), 'MMMM d, yyyy')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="time-format" className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {use12HourFormat ? '12h' : '24h'}
                    </Label>
                    <Switch 
                      id="time-format" 
                      checked={use12HourFormat} 
                      onCheckedChange={setUse12HourFormat} 
                    />
                  </div>
                  <Button onClick={() => setIsManagingItems(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {selectedList.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                      <ListChecks className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No items in this list</h3>
                    <p className="text-muted-foreground max-w-md mb-4">
                      Start adding tasks to this list by clicking the "Add Item" button.
                    </p>
                    <Button onClick={() => setIsManagingItems(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedItems.map(item => (
                      <div key={item.id} className="p-3 bg-card rounded-lg border border-border transition-all hover:shadow-md">
                        {/* Item header */}
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpandItem(item.id)}
                              disabled={!item.subItems || item.subItems.length === 0}
                            >
                              {expandedItemIds.includes(item.id) && (item.subItems?.length || 0) > 0
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4 opacity-50" />
                              }
                            </Button>
                            <Checkbox 
                              checked={item.checked} 
                              onCheckedChange={ch => updateTodoItem(selectedList.id, item.id, { checked: Boolean(ch) })} 
                            />
                            <span className={`${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                              {item.content}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.time && (
                              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                {formatTime(item.time)}
                              </span>
                            )}
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0" 
                                onClick={() => {
                                  openEditItemDialog(item);
                                  setIsManagingItems(true);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive/80" 
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Nested sub-items */}
                        {expandedItemIds.includes(item.id) && (
                          <div className="mt-2 pl-8 space-y-2">
                            {/* Existing sub-items */}
                            {(item.subItems?.length || 0) > 0 && (
                              <div className="space-y-2">
                                {item.subItems?.map(sub => (
                                  <div key={sub.id} className="flex justify-between items-center p-2 rounded-md bg-muted/30 gap-2">
                                    <div className="flex items-center gap-2 flex-1">
                                      <Checkbox 
                                        checked={sub.checked} 
                                        onCheckedChange={ch => {
                                          const updatedSubs = (item.subItems || []).map(s => 
                                            s.id === sub.id ? { ...s, checked: Boolean(ch) } : s
                                          );
                                          updateTodoItem(selectedList.id, item.id, { subItems: updatedSubs });
                                        }} 
                                      />
                                      <span className={`text-sm ${sub.checked ? 'line-through text-muted-foreground' : ''}`}>
                                        {sub.content}
                                      </span>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive/80" 
                                      onClick={() => handleDeleteSubItem(selectedList.id, item.id, sub.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Add sub-item input - always shown when expanded */}
                            <div className="flex items-center gap-2 mt-1 pl-1">
                              <Input
                                id={`sub-input-${item.id}`}
                                placeholder="Add a sub-item..."
                                value={subInputs[item.id] || ''}
                                onChange={e => setSubInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddSubItem(selectedList.id, item.id); }}
                                className="flex-1 h-8 text-sm"
                              />
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-8"
                                onClick={() => handleAddSubItem(selectedList.id, item.id)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Add sub-item button when collapsed */}
                        {!expandedItemIds.includes(item.id) && (
                          <div className="mt-1 ml-8">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => toggleExpandItem(item.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add sub-item
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center relative z-10">
              <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-cosmos-nebula to-cosmos-stardust cosmic-glow flex items-center justify-center float animate-float">
                <ListChecks className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-primary/80 bg-clip-text text-transparent animate-fade-in">Organize Your Tasks</h2>
              <p className="text-muted-foreground mb-6 max-w-md animate-slide-up">
                Create to-do lists and manage your tasks with a beautiful cosmic-themed interface.
                Get started by creating your first to-do list.
              </p>
              <Button 
                onClick={() => setIsAddingList(true)}
                className="bg-gradient-to-r from-primary to-cosmos-nebula hover:from-cosmos-nebula hover:to-primary transition-all duration-500 animate-slide-up btn-glow"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First To-Do List
              </Button>
            </div>
          )}
        </div>
      </ResizablePanel>

      {/* Add List Dialog */}
      <Dialog open={isAddingList} onOpenChange={setIsAddingList}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New To-Do List</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="list-title" className="text-sm font-medium">Title</label>
              <Input id="list-title" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="List title" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="list-date" className="text-sm font-medium">Date</label>
              <Input id="list-date" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddingList(false);
              setNewTitle('');
              setNewDate(new Date().toISOString().split('T')[0]);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (!newTitle.trim()) return;
              const newList = addTodoList({ title: newTitle, date: newDate, items: [] });
              setNewTitle('');
              setNewDate(new Date().toISOString().split('T')[0]);
              setIsAddingList(false);
              setSelectedListId(newList.id);
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={isEditingList} onOpenChange={setIsEditingList}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit To-Do List</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-list-title" className="text-sm font-medium">Title</label>
              <Input id="edit-list-title" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="List title" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-list-date" className="text-sm font-medium">Date</label>
              <Input id="edit-list-date" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingList(false)}>Cancel</Button>
            <Button onClick={handleEditList}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isManagingItems} onOpenChange={setIsManagingItems}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="item-content" className="text-sm font-medium">Task</label>
              <Input 
                id="item-content" 
                value={newItemContent} 
                onChange={e => setNewItemContent(e.target.value)} 
                placeholder="What needs to be done?" 
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="item-time" className="text-sm font-medium">Time (optional)</label>
              <Input 
                id="item-time" 
                type="time" 
                value={newItemTime} 
                onChange={e => setNewItemTime(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsManagingItems(false);
              setIsEditingItem(false);
              setNewItemContent('');
              setNewItemTime('12:00');
            }}>Cancel</Button>
            <Button onClick={isEditingItem ? handleEditItem : handleAddItem}>
              {isEditingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default TodoPage; 