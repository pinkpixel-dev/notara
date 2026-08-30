import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, BellOff, ChevronDown, ChevronRight, Edit3, Plus, Trash2 } from 'lucide-react';
import type { TodoItem } from '@/types';

interface TodoItemRowProps {
  item: TodoItem;
  listId: string;
  isDesktop: boolean;
  formatTime: (timeString: string) => string;
  isExpanded: boolean;
  subInput: string;
  onToggleExpand: (itemId: string) => void;
  onToggleCheck: (checked: boolean) => void;
  onToggleReminder: () => void;
  onEditItem: (item: TodoItem) => void;
  onDeleteItem: (itemId: string) => void;
  onSubInputChange: (value: string) => void;
  onAddSubItem: () => void;
  onToggleSubCheck: (subId: string, checked: boolean) => void;
  onDeleteSubItem: (subId: string) => void;
}

export const TodoItemRow: React.FC<TodoItemRowProps> = ({
  item,
  isDesktop,
  formatTime,
  isExpanded,
  subInput,
  onToggleExpand,
  onToggleCheck,
  onToggleReminder,
  onEditItem,
  onDeleteItem,
  onSubInputChange,
  onAddSubItem,
  onToggleSubCheck,
  onDeleteSubItem,
}) => {
  const hasSubItems = (item.subItems?.length || 0) > 0;

  return (
    <div className="p-3 bg-card rounded-lg border border-border transition-all hover:shadow-md">
      {/* Item header */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 shrink-0"
            onClick={() => onToggleExpand(item.id)}
            disabled={!hasSubItems}
            aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
          >
            {isExpanded && hasSubItems ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className={`h-4 w-4 ${hasSubItems ? '' : 'opacity-50'}`} />
            )}
          </Button>
          <Checkbox
            checked={item.checked}
            onCheckedChange={(ch) => onToggleCheck(Boolean(ch))}
          />
          <span
            className={`truncate text-sm font-medium ${
              item.checked ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {item.content}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {item.time && (
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              {formatTime(item.time)}
            </span>
          )}

          {/* Reminder toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${
              item.reminderEnabled
                ? 'text-primary hover:text-primary/80'
                : 'text-muted-foreground hover:text-foreground opacity-60'
            }`}
            onClick={onToggleReminder}
            title={
              !isDesktop
                ? 'Desktop only: reminders require the Notara desktop app'
                : item.reminderEnabled
                ? 'Reminder enabled (click to disable)'
                : 'Enable reminder for this task'
            }
            aria-label={item.reminderEnabled ? 'Disable reminder' : 'Enable reminder'}
          >
            {item.reminderEnabled ? (
              <Bell className="h-4 w-4 fill-primary/20" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onEditItem(item)}
            aria-label={`Edit ${item.content}`}
          >
            <Edit3 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive/80"
            onClick={() => onDeleteItem(item.id)}
            aria-label={`Delete ${item.content}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Nested sub-items */}
      {isExpanded && (
        <div className="mt-2 pl-8 space-y-2">
          {hasSubItems && (
            <div className="space-y-2">
              {item.subItems?.map((sub) => (
                <div
                  key={sub.id}
                  className="flex justify-between items-center p-2 rounded-md bg-muted/30 gap-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Checkbox
                      checked={sub.checked}
                      onCheckedChange={(ch) => onToggleSubCheck(sub.id, Boolean(ch))}
                    />
                    <span
                      className={`truncate text-sm ${
                        sub.checked ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {sub.content}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                    onClick={() => onDeleteSubItem(sub.id)}
                    aria-label={`Delete subtask ${sub.content}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add sub-item input */}
          <div className="flex items-center gap-2 mt-1 pl-1">
            <Input
              id={`sub-input-${item.id}`}
              placeholder="Add a sub-item..."
              value={subInput}
              onChange={(e) => onSubInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAddSubItem();
              }}
              className="flex-1 h-8 text-sm"
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={onAddSubItem}
              aria-label="Add sub-item"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add sub-item button when collapsed */}
      {!isExpanded && (
        <div className="mt-1 ml-8">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onToggleExpand(item.id)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add sub-item
          </Button>
        </div>
      )}
    </div>
  );
};

export default TodoItemRow;
