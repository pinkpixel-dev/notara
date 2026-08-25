import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useTodo } from '@/context/TodoContextTypes';
import { format, parse, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TodoDialogs from '@/components/todo/TodoDialogs';
import { Edit3, Trash2, ListChecks, ChevronDown, ChevronRight, Plus, Calendar, Check, CheckCircle2, CircleDashed, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidv4 } from 'uuid';
import type { TodoItem, TodoList } from '@/types';
import WorkspacePanes, { WorkspacePaneId } from '@/components/layout/WorkspacePanes';
import { useSidebarPane } from '@/hooks/use-sidebar-pane';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePublishWorkspaceFocus } from '@/context/WorkspaceFocusContext';

const TodoPage: React.FC = () => {
  const { todoLists, addTodoList, updateTodoList, deleteTodoList, addTodoItem, updateTodoItem, deleteTodoItem } = useTodo();
  const [activePane, setActivePane] = useState<WorkspacePaneId>('list');
  const sidebar = useSidebarPane();
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
  const [use12HourFormat, setUse12HourFormat] = useState(true);
  const [showSubInputs, setShowSubInputs] = useState<Record<string, boolean>>({});
  const focusTarget = useMemo(() => ({ kind: 'todo-list' as const, listId: selectedListId }), [selectedListId]);
  usePublishWorkspaceFocus(focusTarget);

  // Select the first list when the component mounts if there are any lists
  useEffect(() => {
    if (todoLists.length > 0 && !selectedListId) {
      setSelectedListId(todoLists[0].id);
    }
  }, [todoLists, selectedListId]);

  const handleCreateList = () => {
    if (!newTitle.trim()) return;
    const newList = addTodoList({ title: newTitle, date: newDate, items: [] });
    setNewTitle('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setIsAddingList(false);
    setSelectedListId(newList.id);
  };

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
      {!sidebar.ready ? null : (
      <WorkspacePanes
        listLabel="Lists"
        detailLabel="Tasks"
        activePane={activePane}
        onPaneChange={setActivePane}
        listDefaultPx={sidebar.listDefaultPx}
        listMinPx={sidebar.listMinPx}
        listDefaultSize={30}
        listMinSize={15}
        listMaxSize={40}
        storageKey="todo"
        list={
        <div className="h-full flex flex-col surface-content">
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
              <ul className="space-y-1 p-2">
                {todoLists.map(list => (
                  /* Selecting the list is a button, so the row is keyboard
                     reachable. Edit and delete are siblings rather than nested
                     buttons. */
                  <li key={list.id} className="relative">
                    <button
                      type="button"
                      aria-current={selectedListId === list.id ? 'true' : undefined}
                      className={`min-h-11 w-full rounded-md p-3 pr-24 text-left transition-colors ${
                        selectedListId === list.id
                          ? 'bg-accent text-foreground'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedListId(list.id);
                        setActivePane('detail');
                      }}
                    >
                      <span className="block truncate font-medium">{list.title}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {format(parseISO(list.date), 'MMM d, yyyy')}
                        <span className="mx-1" aria-hidden="true">•</span>
                        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                        {list.items.filter(item => item.checked).length}/{list.items.length}
                      </span>
                    </button>
                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        aria-label={`Edit ${list.title}`}
                        onClick={() => openEditDialog(list)}
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                        aria-label={`Delete ${list.title}`}
                        onClick={() => handleDeleteList(list.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        }
        detail={
        <div className="h-full border-l border-border/30 relative">
          
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
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-primary" />
              </div>
              <p className="text-muted-foreground mb-6 max-w-md">
                Get started by creating a to-do list or selecting an existing one from the sidebar.
              </p>
              <Button 
                onClick={() => setIsAddingList(true)}
                className="transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create To-Do List
              </Button>
            </div>
          )}
        </div>
        }
      />
      )}

      <TodoDialogs
        isAddingList={isAddingList}
        setIsAddingList={setIsAddingList}
        isEditingList={isEditingList}
        setIsEditingList={setIsEditingList}
        isManagingItems={isManagingItems}
        setIsManagingItems={setIsManagingItems}
        isEditingItem={isEditingItem}
        setIsEditingItem={setIsEditingItem}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newDate={newDate}
        setNewDate={setNewDate}
        newItemContent={newItemContent}
        setNewItemContent={setNewItemContent}
        newItemTime={newItemTime}
        setNewItemTime={setNewItemTime}
        onCreateList={handleCreateList}
        onEditList={handleEditList}
        onAddItem={handleAddItem}
        onEditItem={handleEditItem}
      />
    </AppLayout>
  );
};

export default TodoPage; 
