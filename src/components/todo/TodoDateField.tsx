import React, { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as DateCalendar } from '@/components/ui/calendar';

export const getTodoDateValue = (value: string): Date => {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
};

interface TodoDateFieldProps {
  id: string;
  value: string;
  onChange: (nextValue: string) => void;
}

/** A date button that reveals an inline calendar, used by the to-do dialogs. */
const TodoDateField: React.FC<TodoDateFieldProps> = ({ id, value, onChange }) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const selectedDate = getTodoDateValue(value);

  return (
    <div className="space-y-3">
      <Button
        id={id}
        type="button"
        variant="outline"
        className="w-full justify-between text-left font-normal"
        onClick={() => setIsCalendarOpen((open) => !open)}
        aria-expanded={isCalendarOpen}
      >
        <span>{format(selectedDate, 'MMMM d, yyyy')}</span>
        <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </Button>

      {isCalendarOpen ? (
        <div className="rounded-lg border border-border bg-card p-2">
          <DateCalendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) {
                return;
              }

              onChange(format(date, 'yyyy-MM-dd'));
              setIsCalendarOpen(false);
            }}
            className="w-full"
          />
        </div>
      ) : null}
    </div>
  );
};

export default TodoDateField;
