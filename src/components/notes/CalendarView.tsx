import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { useNotes } from '@/context/NotesContextTypes';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Clock } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

const CalendarView: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventContent, setEventContent] = useState('');
  const [eventTime, setEventTime] = useState('12:00');

  // Debug log all notes when component renders
  React.useEffect(() => {
    console.log('All notes:', notes.map(note => ({
      id: note.id,
      title: note.title,
      date: new Date(note.createdAt).toISOString(),
      formattedDate: format(new Date(note.createdAt), 'yyyy-MM-dd HH:mm')
    })));

    if (date) {
      console.log('Current selected date:', format(date, 'yyyy-MM-dd'));
    }
  }, [notes, date]);

  // Filter notes for the selected date
  const notesOnDate = notes.filter(note => {
    if (!date) return false;
    const noteDate = new Date(note.createdAt);

    const isMatch = (
      noteDate.getDate() === date.getDate() &&
      noteDate.getMonth() === date.getMonth() &&
      noteDate.getFullYear() === date.getFullYear()
    );

    // Debug logging to help diagnose date filtering issues
    if (isMatch) {
      console.log('Note matched for date:', format(date, 'yyyy-MM-dd'), 'Note date:', format(noteDate, 'yyyy-MM-dd'), 'Note:', note.title);
    }

    return isMatch;
  });

  const handleAddEvent = () => {
    if (!eventTitle.trim() || !date) return;

    // Parse hours and minutes
    const hours = parseInt(eventTime.split(':')[0] || '0');
    const minutes = parseInt(eventTime.split(':')[1] || '0');

    // Create a completely new date object with the correct year, month, day
    // This ensures we don't modify the original date object
    const selectedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      0
    );

    console.log('Creating event for date:', selectedDate.toISOString());

    addNote({
      title: eventTitle,
      content: eventContent,
      tags: [],
      isPinned: false,
      createdAt: selectedDate.toISOString()
    });

    setEventTitle('');
    setEventContent('');
    setEventTime('');
    setIsAddingEvent(false);
  };

  const handleEditEvent = () => {
    if (!eventTitle.trim() || !date || !currentEvent) return;

    // Parse hours and minutes
    const hours = parseInt(eventTime.split(':')[0] || '0');
    const minutes = parseInt(eventTime.split(':')[1] || '0');

    // Create a completely new date object with the correct year, month, day
    // This ensures we don't modify the original date object
    const selectedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      0
    );

    console.log('Updating event for date:', selectedDate.toISOString());

    updateNote(currentEvent, {
      title: eventTitle,
      content: eventContent,
      createdAt: selectedDate.toISOString()
    });

    setEventTitle('');
    setEventContent('');
    setEventTime('');
    setCurrentEvent(null);
    setIsEditingEvent(false);
  };

  const handleDeleteEvent = (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteNote(id);
    }
  };

  const openEditDialog = (note: Note) => {
    setCurrentEvent(note.id);
    setEventTitle(note.title);
    setEventContent(note.content);

    // Extract time from the note's createdAt
    const noteDate = new Date(note.createdAt);
    const hours = noteDate.getHours().toString().padStart(2, '0');
    const minutes = noteDate.getMinutes().toString().padStart(2, '0');
    setEventTime(`${hours}:${minutes}`);

    setIsEditingEvent(true);
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-x-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Calendar
        </h2>
        <Button onClick={() => {
          // Make sure we have a default time set
          if (eventTime === '') {
            setEventTime('12:00');
          }
          setIsAddingEvent(true);
          console.log('Opening Add Event dialog for date:', date ? format(date, 'yyyy-MM-dd') : 'No date selected');
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Event
        </Button>
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="h-[calc(100%-3rem)] w-full"
      >
        <ResizablePanel
          defaultSize={45}
          minSize={40}
          className="bg-card/50 rounded-lg border border-border/50 backdrop-blur-sm shadow-lg cosmic-glow min-w-[400px]"
        >
          <div className="p-4 h-full flex flex-col items-center pt-8">
            <div className="calendar-wrapper w-full max-w-[380px]">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  if (newDate) {
                    // Create a new date object to avoid any reference issues
                    const selectedDate = new Date(
                      newDate.getFullYear(),
                      newDate.getMonth(),
                      newDate.getDate(),
                      12, // Default to noon
                      0,
                      0
                    );
                    console.log('Date selected:', selectedDate.toISOString());
                    setDate(selectedDate);
                  } else {
                    setDate(undefined);
                  }
                }}
                className={cn(
                  "mx-auto border-none bg-transparent",
                  "w-full [&_.rdp-caption]:text-xl [&_.rdp-caption]:font-semibold"
                )}
              />

              <div className="text-center mt-6">
                <h3 className="text-xl font-medium">
                  {date ? format(date, 'MMMM d, yyyy') : 'Select a date'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Click on a date to view or add events
                </p>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-border/30 hover:bg-primary/50 transition-colors" />

        <ResizablePanel defaultSize={55} className="bg-card/30 rounded-lg p-4 border border-border/50 flex flex-col min-w-[300px]">
          <h3 className="text-md font-semibold mb-3 px-2">
            {date ? `Events for ${format(date, 'MMMM d, yyyy')}` : 'Select a date'}
          </h3>

          {notesOnDate.length > 0 ? (
            <div className="space-y-3 overflow-y-auto flex-1">
              {notesOnDate.map(note => {
                const noteTime = new Date(note.createdAt);
                return (
                  <Card key={note.id} className="bg-secondary/30 hover:bg-secondary/40 transition-colors border-border/50 cosmic-glow">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">{note.title}</h4>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {format(noteTime, 'h:mm a')}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{note.content.substring(0, 100)}</p>
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex gap-1">
                          {note.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="px-1.5 py-0.5 text-xs rounded-full"
                              style={{ backgroundColor: `${tag.color}30`, color: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => openEditDialog(note)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(note.id);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col items-center justify-center">
              <p>No events for this date</p>
              <Button variant="link" onClick={() => {
                // Make sure we have a default time set
                if (eventTime === '') {
                  setEventTime('12:00');
                }
                setIsAddingEvent(true);
                console.log('Opening Add Event dialog from empty state for date:', date ? format(date, 'yyyy-MM-dd') : 'No date selected');
              }} className="mt-2">
                Add an event
              </Button>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Add Event Dialog */}
      <Dialog open={isAddingEvent} onOpenChange={(open) => {
        if (!open) {
          // When closing the dialog, make sure we don't lose our date selection
          console.log('Closing Add Event dialog, preserving date:', date ? format(date, 'yyyy-MM-dd') : 'No date');
        }
        setIsAddingEvent(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Event for {date ? format(date, 'MMMM d, yyyy') : 'Selected Date'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="event-title" className="text-sm font-medium">
                Event Title
              </label>
              <Input
                id="event-title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Enter event title"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="event-time" className="text-sm font-medium">
                Time
              </label>
              <Input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="event-content" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="event-content"
                value={eventContent}
                onChange={(e) => setEventContent(e.target.value)}
                placeholder="Event details..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingEvent(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEvent}>
              Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditingEvent} onOpenChange={(open) => {
        if (!open) {
          // When closing the dialog, make sure we don't lose our date selection
          console.log('Closing Edit Event dialog, preserving date:', date ? format(date, 'yyyy-MM-dd') : 'No date');
        }
        setIsEditingEvent(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event for {date ? format(date, 'MMMM d, yyyy') : 'Selected Date'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-event-title" className="text-sm font-medium">
                Event Title
              </label>
              <Input
                id="edit-event-title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Enter event title"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="edit-event-time" className="text-sm font-medium">
                Time
              </label>
              <Input
                id="edit-event-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="edit-event-content" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="edit-event-content"
                value={eventContent}
                onChange={(e) => setEventContent(e.target.value)}
                placeholder="Event details..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditingEvent(false);
              setCurrentEvent(null);
              setEventTitle('');
              setEventContent('');
              setEventTime('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditEvent}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarView;
