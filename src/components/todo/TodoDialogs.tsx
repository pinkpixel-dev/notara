import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TodoDateField from './TodoDateField';

import { Switch } from '@/components/ui/switch';
import { Bell, Info } from 'lucide-react';

interface TodoDialogsProps {
  isAddingList: boolean;
  setIsAddingList: (open: boolean) => void;
  isEditingList: boolean;
  setIsEditingList: (open: boolean) => void;
  isManagingItems: boolean;
  setIsManagingItems: (open: boolean) => void;
  isEditingItem: boolean;
  setIsEditingItem: (editing: boolean) => void;

  newTitle: string;
  setNewTitle: (value: string) => void;
  newDate: string;
  setNewDate: (value: string) => void;
  newItemContent: string;
  setNewItemContent: (value: string) => void;
  newItemTime: string;
  setNewItemTime: (value: string) => void;
  newItemReminderEnabled: boolean;
  setNewItemReminderEnabled: (value: boolean) => void;
  isDesktop: boolean;

  onCreateList: () => void;
  onEditList: () => void;
  onAddItem: () => void;
  onEditItem: () => void;
}

/** The create, edit, and item dialogs for the to-do page. */
const TodoDialogs: React.FC<TodoDialogsProps> = ({
  isAddingList, setIsAddingList,
  isEditingList, setIsEditingList,
  isManagingItems, setIsManagingItems,
  isEditingItem, setIsEditingItem,
  newTitle, setNewTitle,
  newDate, setNewDate,
  newItemContent, setNewItemContent,
  newItemTime, setNewItemTime,
  newItemReminderEnabled, setNewItemReminderEnabled,
  isDesktop,
  onCreateList, onEditList, onAddItem, onEditItem,
}) => {
  const resetListDraft = () => {
    setNewTitle('');
    setNewDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <>
      <Dialog open={isAddingList} onOpenChange={setIsAddingList}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New To-Do List</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="list-title">Title</Label>
              <Input
                id="list-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="List title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="list-date">Date</Label>
              <TodoDateField id="list-date" value={newDate} onChange={setNewDate} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingList(false);
                resetListDraft();
              }}
            >
              Cancel
            </Button>
            <Button onClick={onCreateList} disabled={!newTitle.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingList} onOpenChange={setIsEditingList}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit To-Do List</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-list-title">Title</Label>
              <Input
                id="edit-list-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="List title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-list-date">Date</Label>
              <TodoDateField id="edit-list-date" value={newDate} onChange={setNewDate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingList(false)}>Cancel</Button>
            <Button onClick={onEditList} disabled={!newTitle.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManagingItems} onOpenChange={setIsManagingItems}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="item-content">Task</Label>
              <Input
                id="item-content"
                value={newItemContent}
                onChange={(e) => setNewItemContent(e.target.value)}
                placeholder="What needs to be done?"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-time">Time (optional)</Label>
              <Input
                id="item-time"
                type="time"
                value={newItemTime}
                onChange={(e) => setNewItemTime(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="space-y-0.5">
                <Label htmlFor="item-reminder" className="text-sm font-medium flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-primary" />
                  Due-linked Reminder
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isDesktop
                    ? 'Notify at the scheduled date and time'
                    : 'Reminders are desktop-only'}
                </p>
              </div>
              <Switch
                id="item-reminder"
                checked={newItemReminderEnabled}
                onCheckedChange={setNewItemReminderEnabled}
              />
            </div>
            {!isDesktop && newItemReminderEnabled && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Running in browser: reminders will activate when opened in the Notara desktop app.</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsManagingItems(false);
                setIsEditingItem(false);
                setNewItemContent('');
                setNewItemTime('12:00');
                setNewItemReminderEnabled(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditingItem ? onEditItem : onAddItem}
              disabled={!newItemContent.trim()}
            >
              {isEditingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TodoDialogs;
