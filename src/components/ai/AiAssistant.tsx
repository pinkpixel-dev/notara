import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useNotes } from '@/context/NotesContextTypes';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import {
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Search,
  Plus,
  Check,
  X,
  History,
  Settings
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { calculateNoteSimilarity } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  imageUrl?: string;
}

interface SummaryType {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

interface SummaryHistory {
  id: string;
  content: string;
  timestamp: string;
  noteIds: string[]; // IDs of notes that were summarized
  summaryType: string; // ID of the summary type used
}

interface NoteSelection {
  id: string;
  selected: boolean;
  lastSummarized?: string; // ISO timestamp
}

// Configuration for the Pollinations API
const API_CONFIG = {
  textModel: 'openai-large',
  imageModel: 'flux',
  private: true,
  enhance: true,
  noLogo: true,
  safe: false
};

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are Notara's AI assistant, designed to help users with their notes and writing.
You can:
1. Answer questions about the user's notes
2. Generate creative content
3. Summarize existing notes
4. Provide writing prompts and suggestions
5. Help organize information

Be concise, helpful, and creative. When generating content, focus on quality and relevance to the user's needs.
If asked to create images, describe what you would generate but don't attempt to create the image yourself - the user will use the image generation button.`;

const AiAssistant: React.FC = () => {
  const { notes, tags, moodBoards, addNote } = useNotes();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI assistant for Notara. I can help you with your notes, generate ideas, or answer questions. I can also analyze your Mood Boards and Constellation View. How can I help you today?",
      sender: 'ai',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number, height: number }>({ width: 1024, height: 1024 });

  // New state variables for enhanced summarization
  const [selectedNotes, setSelectedNotes] = useState<NoteSelection[]>([]);
  const [summaryTypes, setSummaryTypes] = useState<SummaryType[]>([
    {
      id: 'concise',
      name: 'Concise',
      description: 'A brief overview of key points',
      prompt: 'Provide a concise summary of the main points in these notes. Keep it brief and to the point.'
    },
    {
      id: 'detailed',
      name: 'Detailed',
      description: 'A comprehensive summary with all important details',
      prompt: 'Create a detailed summary of these notes, including all important information, concepts, and details.'
    },
    {
      id: 'bullets',
      name: 'Bullet Points',
      description: 'Key points in bullet point format',
      prompt: 'Summarize these notes as a list of bullet points, highlighting the most important information.'
    },
    {
      id: 'actionItems',
      name: 'Action Items',
      description: 'Extract tasks and action items',
      prompt: 'Extract all action items, tasks, and to-dos from these notes. Format them as a checklist.'
    },
    {
      id: 'concepts',
      name: 'Key Concepts',
      description: 'Focus on main concepts and ideas',
      prompt: 'Identify and explain the key concepts, ideas, and themes present in these notes.'
    }
  ]);
  const [selectedSummaryType, setSelectedSummaryType] = useState<string>('concise');
  const [summaryHistory, setSummaryHistory] = useState<SummaryHistory[]>([]);
  const [showSummaryOptions, setShowSummaryOptions] = useState<boolean>(false);
  const [showSummaryHistory, setShowSummaryHistory] = useState<boolean>(false);
  const [summaryMode, setSummaryMode] = useState<'all' | 'selected' | 'new' | 'related'>('all');
  const [groupByTags, setGroupByTags] = useState<boolean>(false);

  // New state variables for Mood Board and Constellation View
  const [includeMoodBoards, setIncludeMoodBoards] = useState<boolean>(false);
  const [includeConstellationView, setIncludeConstellationView] = useState<boolean>(false);
  const [selectedMoodBoards, setSelectedMoodBoards] = useState<string[]>([]);
  const [constellationSimilarityThreshold, setConstellationSimilarityThreshold] = useState<number>(0.3);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentMessageId = useRef<string>('');

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Check if a message is a calendar-related query
  const isCalendarQuery = (message: string): boolean => {
    const calendarKeywords = [
      'calendar', 'schedule', 'event', 'meeting', 'appointment', 'reminder',
      'when is', 'what time', 'what day', 'what date', 'upcoming', 'today\'s',
      'tomorrow\'s', 'next week', 'this week', 'this month'
    ];

    const lowerMessage = message.toLowerCase();
    return calendarKeywords.some(keyword => lowerMessage.includes(keyword));
  };

  // Parse a calendar query to determine the date range
  const parseCalendarDateRange = (query: string): { startDate?: Date, endDate?: Date } => {
    const lowerQuery = query.toLowerCase();
    const now = new Date();

    // Default to current month
    let startDate: Date | undefined = new Date(now.getFullYear(), now.getMonth(), 1);
    let endDate: Date | undefined = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Check for specific date patterns
    if (lowerQuery.includes('today')) {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (lowerQuery.includes('tomorrow')) {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);
    } else if (lowerQuery.includes('this week')) {
      // Start of current week (Sunday)
      const dayOfWeek = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59);
    } else if (lowerQuery.includes('next week')) {
      // Start of next week (Sunday)
      const dayOfWeek = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 13, 23, 59, 59);
    } else if (lowerQuery.includes('this month')) {
      // Already set to current month by default
    } else if (lowerQuery.includes('next month')) {
      startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    }

    // Check for specific event queries
    if (lowerQuery.includes('meeting') || lowerQuery.includes('appointment')) {
      // Look for specific event titles in the query
      const eventKeywords = query.split(' ')
        .filter(word => word.length > 3) // Filter out short words
        .map(word => word.replace(/[.,?!;:]/g, '').toLowerCase()); // Remove punctuation

      // Find events that match the keywords
      const matchingEvents = notes.filter(note => {
        const noteDate = new Date(note.createdAt);
        const isInDefaultRange = noteDate >= startDate! && noteDate <= endDate!;
        const hasSpecificTime = noteDate.getHours() !== 0 || noteDate.getMinutes() !== 0;

        // Check if the note title or content contains any of the keywords
        const matchesKeywords = eventKeywords.some(keyword =>
          note.title.toLowerCase().includes(keyword) ||
          note.content.toLowerCase().includes(keyword)
        );

        return isInDefaultRange && hasSpecificTime && matchesKeywords;
      });

      // If we found specific matching events, adjust the date range to focus on them
      if (matchingEvents.length > 0) {
        // Find the earliest and latest matching events
        const eventDates = matchingEvents.map(event => new Date(event.createdAt));
        const earliestEvent = new Date(Math.min(...eventDates.map(date => date.getTime())));
        const latestEvent = new Date(Math.max(...eventDates.map(date => date.getTime())));

        // Set the date range to cover all matching events with a small buffer
        startDate = new Date(earliestEvent);
        startDate.setDate(startDate.getDate() - 1);

        endDate = new Date(latestEvent);
        endDate.setDate(endDate.getDate() + 1);
      }
    }

    return { startDate, endDate };
  };

  // Handle calendar-related queries
  const handleCalendarQuery = async (query: string) => {
    // Parse the query to determine the date range
    const { startDate, endDate } = parseCalendarDateRange(query);

    // Get calendar data for the specified date range
    const calendarData = formatCalendarData(startDate, endDate);

    // Create a prompt that includes the calendar data and the user's query
    const prompt = `
I need to answer a question about the user's calendar or schedule.

Here is the calendar data:
${calendarData || "No calendar events found for the specified time period."}

The user's question is: "${query}"

Please provide a helpful and concise response that directly answers their question about their calendar or schedule.
If there are no relevant events, let them know. If their question is about a specific date or time period that's not
covered in the calendar data, please mention that.
`;

    // Send the prompt to the API
    await streamChatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      handleStreamChunk
    );
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    setIsProcessing(true);

    try {
      // Initialize response message with empty content
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          content: '',
          sender: 'ai',
          timestamp: new Date().toISOString()
        }
      ]);

      // Check if this is a calendar-related query
      if (isCalendarQuery(inputMessage)) {
        await handleCalendarQuery(inputMessage);
      } else {
        // Regular message processing
        await streamChatCompletion(
          [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.filter(msg => msg.imageUrl === undefined).map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant' as 'user' | 'assistant',
              content: msg.content
            })),
            { role: "user", content: inputMessage }
          ],
          handleStreamChunk
        );
      }
    } catch (error) {
      console.error("Error in chat completion:", error);

      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.sender === 'ai' && last.content === '') {
          return [
            ...prev.slice(0, -1),
            {
              id: uuidv4(),
              content: "I'm sorry, I encountered an error processing your request. Please try again.",
              sender: 'ai',
              timestamp: new Date().toISOString()
            }
          ];
        }
        return [
          ...prev,
          {
            id: uuidv4(),
            content: "I'm sorry, I encountered an error processing your request. Please try again.",
            sender: 'ai',
            timestamp: new Date().toISOString()
          }
        ];
      });
    } finally {
      setIsTyping(false);
      setIsProcessing(false);
    }
  };

  // Use a ref to accumulate content to reduce re-renders
  const contentAccumulatorRef = useRef<string>('');

  // Handle incoming stream chunks
  const handleStreamChunk = (chunk: string) => {
    // Accumulate content in the ref
    contentAccumulatorRef.current += chunk;

    // Use a more stable approach to update messages
    setMessages(prev => {
      const lastIndex = prev.length - 1;
      const lastMessage = prev[lastIndex];

      // Only update if we have a last message from AI
      if (lastMessage && lastMessage.sender === 'ai') {
        // Create a new array with all messages except the last one
        const messagesWithoutLast = prev.slice(0, -1);

        // Create an updated version of the last message
        const updatedMessage = {
          ...lastMessage,
          content: contentAccumulatorRef.current
        };

        // Return a new array with all messages except the last one, plus the updated message
        return [...messagesWithoutLast, updatedMessage];
      } else {
        // If there's no last message from AI, create a new one
        return [
          ...prev,
          {
            id: uuidv4(),
            content: contentAccumulatorRef.current,
            sender: 'ai',
            timestamp: new Date().toISOString()
          }
        ];
      }
    });
  };

  // Stream chat completion from Pollinations API
  const streamChatCompletion = async (messages: Array<{ role: string, content: string }>, onChunkReceived: (chunk: string) => void) => {
    try {
      // Reset the content accumulator
      contentAccumulatorRef.current = '';

      const payload = {
        model: API_CONFIG.textModel,
        messages: messages,
        private: API_CONFIG.private,
        stream: true,
      };

      const response = await fetch("https://text.pollinations.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get reader from response");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let localAccumulatedContent = ""; // Local accumulation to reduce UI updates
      let lastUpdateTime = Date.now();
      const UPDATE_INTERVAL = 500; // Update UI every 500ms to reduce flashing

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream finished.");
          // Send any remaining accumulated content
          if (localAccumulatedContent && onChunkReceived) {
            onChunkReceived(localAccumulatedContent);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process buffer line by line (SSE format: data: {...}\n\n)
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep the potentially incomplete last line

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6).trim();
            if (dataStr === "[DONE]") {
              console.log("Received [DONE] marker.");
              continue;
            }
            try {
              const chunk = JSON.parse(dataStr);
              const content = chunk?.choices?.[0]?.delta?.content;
              if (content) {
                // Accumulate content instead of updating UI immediately
                localAccumulatedContent += content;

                // Only update UI periodically to reduce flashing
                const now = Date.now();
                if (now - lastUpdateTime >= UPDATE_INTERVAL) {
                  if (onChunkReceived && localAccumulatedContent) {
                    onChunkReceived(localAccumulatedContent);
                    localAccumulatedContent = ""; // Reset accumulated content
                    lastUpdateTime = now;
                  }
                }
              }
            } catch (e) {
              console.error("Failed to parse stream chunk:", dataStr, e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error during streaming chat completion:", error);
      throw error;
    }
  };

  // Generate focus prompts
  const handleGenerateFocusPrompt = async () => {
    setIsTyping(true);
    setIsProcessing(true);

    try {
      // Initialize response message with empty content
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          content: '',
          sender: 'ai',
          timestamp: new Date().toISOString()
        }
      ]);

      await streamChatCompletion(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: "Generate a creative writing prompt to help me focus and get past writer's block. Make it thoughtful and inspiring." }
        ],
        handleStreamChunk
      );

      toast({
        title: "Focus Prompt Generated",
        description: "A new writing prompt has been created to help you focus."
      });
    } catch (error) {
      console.error("Error generating focus prompt:", error);

      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.sender === 'ai' && last.content === '') {
          return [
            ...prev.slice(0, -1),
            {
              id: uuidv4(),
              content: "I'm sorry, I encountered an error generating a focus prompt. Please try again.",
              sender: 'ai',
              timestamp: new Date().toISOString()
            }
          ];
        }
        return [
          ...prev,
          {
            id: uuidv4(),
            content: "I'm sorry, I encountered an error generating a focus prompt. Please try again.",
            sender: 'ai',
            timestamp: new Date().toISOString()
          }
        ];
      });
    } finally {
      setIsTyping(false);
      setIsProcessing(false);
    }
  };

  // Summarize notes
  const handleSummarizeNotes = async () => {
    // If no notes, show error
    if (notes.length === 0) {
      toast({
        title: "No notes to summarize",
        description: "You don't have any notes to summarize yet.",
        variant: "destructive"
      });
      return;
    }

    // If summary options aren't shown yet, show them first
    if (!showSummaryOptions && !selectedNotes.length) {
      // Initialize selectedNotes based on current notes
      setSelectedNotes(notes.map(note => ({
        id: note.id,
        selected: false,
        lastSummarized: note.updatedAt // Use note's updated timestamp as initial lastSummarized
      })));
      setShowSummaryOptions(true);
      return;
    }

    // If the dialog was just closed by the Summarize button, we should continue with the summarization
    // Otherwise, if the dialog is not shown and we have no selected notes, show the dialog
    if (!showSummaryOptions && selectedNotes.length === 0) {
      setShowSummaryOptions(true);
      return;
    }

    setIsTyping(true);
    setIsProcessing(true);

    try {
      // Determine which notes to summarize based on summaryMode
      let notesToSummarize: Note[] = [];

      switch (summaryMode) {
        case 'all':
          notesToSummarize = notes;
          break;

        case 'selected':
          notesToSummarize = notes.filter(note =>
            selectedNotes.find(selected => selected.id === note.id && selected.selected)
          );
          break;

        case 'new':
          // Get notes that have been updated since last summarized
          notesToSummarize = notes.filter(note => {
            const selected = selectedNotes.find(selected => selected.id === note.id);
            return !selected?.lastSummarized || new Date(note.updatedAt) > new Date(selected.lastSummarized);
          });
          break;

        case 'related':
          // Use similarity calculation to find related notes
          if (selectedNotes.some(note => note.selected)) {
            // Get IDs of selected notes
            const selectedIds = selectedNotes
              .filter(note => note.selected)
              .map(note => note.id);

            // Find notes related to selected notes using similarity
            const similarities = calculateNoteSimilarity(notes);
            const relatedIds = new Set<string>();

            // For each selected note, find related notes above threshold
            selectedIds.forEach(id => {
              if (similarities[id]) {
                Object.keys(similarities[id]).forEach(relatedId => {
                  if (similarities[id][relatedId] >= 0.3) { // Use 0.3 as threshold
                    relatedIds.add(relatedId);
                  }
                });
              }
            });

            // Add selected notes and related notes to notesToSummarize
            notesToSummarize = notes.filter(note =>
              selectedIds.includes(note.id) || relatedIds.has(note.id)
            );
          } else {
            // If no notes selected, use all notes
            notesToSummarize = notes;
          }
          break;
      }

      // If no notes to summarize, show error
      if (notesToSummarize.length === 0) {
        toast({
          title: "No notes to summarize",
          description: "No notes match your selection criteria.",
          variant: "destructive"
        });
        setIsTyping(false);
        setIsProcessing(false);
        return;
      }

      // Get the selected summary type
      const summaryType = summaryTypes.find(type => type.id === selectedSummaryType) || summaryTypes[0];

      // Format notes content
      let notesContent = '';

      // If categorized by tags, group notes by tag
      if (summaryMode === 'all' && groupByTags) {
        // Get all unique tags
        const allTags = new Set<string>();
        notesToSummarize.forEach(note => {
          note.tags.forEach(tag => allTags.add(tag.id));
        });

        // Group notes by tag
        Array.from(allTags).forEach(tagId => {
          const tag = tags.find(t => t.id === tagId);
          if (tag) {
            notesContent += `## Tag: ${tag.name}\n\n`;

            // Add notes with this tag
            notesToSummarize
              .filter(note => note.tags.some(t => t.id === tagId))
              .forEach(note => {
                notesContent += `### ${note.title}\n${note.content}\n\n`;
              });
          }
        });

        // Add notes without tags
        const notesWithoutTags = notesToSummarize.filter(note => note.tags.length === 0);
        if (notesWithoutTags.length > 0) {
          notesContent += `## Untagged Notes\n\n`;
          notesWithoutTags.forEach(note => {
            notesContent += `### ${note.title}\n${note.content}\n\n`;
          });
        }
      } else {
        // Standard format - all notes in sequence
        notesContent = notesToSummarize.map(note =>
          `# ${note.title}\n${note.content}`
        ).join('\n\n');
      }

      // Get additional context from Mood Boards if enabled
      let moodBoardContent = '';
      if (includeMoodBoards) {
        moodBoardContent = formatMoodBoardData(selectedMoodBoards);
      }

      // Get additional context from Constellation View if enabled
      let constellationContent = '';
      if (includeConstellationView) {
        constellationContent = formatConstellationData(constellationSimilarityThreshold);
      }

      // Get previous summary if doing incremental summarization
      let prompt = summaryType.prompt;
      if (summaryMode === 'new' && summaryHistory.length > 0) {
        // Get most recent summary
        const lastSummary = summaryHistory[summaryHistory.length - 1];

        // Add context from previous summary
        prompt = `
I previously summarized some notes and got this summary:
${lastSummary.content}

Here are new or updated notes that need to be incorporated:
${notesContent}

${moodBoardContent}
${constellationContent}

Please provide an updated summary that includes both the previous information and the new content.
Use the following style: ${summaryType.prompt}
`;
      } else if (summaryMode === 'related') {
        // Context-aware summarization
        prompt = `
The following notes are related to each other based on content similarity.
Please summarize them, highlighting the connections and common themes between them.
Use the following style: ${summaryType.prompt}

${notesContent}

${moodBoardContent}
${constellationContent}
`;
      } else {
        // Standard summarization
        prompt = `
Please summarize the following notes.
${summaryType.prompt}

${notesContent}

${moodBoardContent}
${constellationContent}
`;
      }

      // Initialize response message with empty content
      const newMessageId = uuidv4();
      currentMessageId.current = newMessageId;

      setMessages(prev => [
        ...prev,
        {
          id: newMessageId,
          content: '',
          sender: 'ai',
          timestamp: new Date().toISOString()
        }
      ]);

      // Send request to API
      await streamChatCompletion(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        handleStreamChunk
      );

      // Update lastSummarized timestamp for summarized notes
      setSelectedNotes(prev =>
        prev.map(note => {
          if (notesToSummarize.some(n => n.id === note.id)) {
            return { ...note, lastSummarized: new Date().toISOString() };
          }
          return note;
        })
      );

      // Add to summary history
      const newSummaryId = uuidv4();

      // Get the content of the last message (the summary)
      setTimeout(() => {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.sender === 'ai') {
            setSummaryHistory(prevHistory => [
              ...prevHistory,
              {
                id: newSummaryId,
                content: lastMessage.content,
                timestamp: new Date().toISOString(),
                noteIds: notesToSummarize.map(note => note.id),
                summaryType: selectedSummaryType
              }
            ]);
          }
          return prev;
        });
      }, 500);

      // Dialog should already be closed by the button click

      toast({
        title: "Notes Summarized",
        description: "A summary of your notes has been created."
      });
    } catch (error) {
      console.error("Error summarizing notes:", error);

      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.sender === 'ai' && last.content === '') {
          return [
            ...prev.slice(0, -1),
            {
              id: uuidv4(),
              content: "I'm sorry, I encountered an error summarizing your notes. Please try again.",
              sender: 'ai',
              timestamp: new Date().toISOString()
            }
          ];
        }
        return [
          ...prev,
          {
            id: uuidv4(),
            content: "I'm sorry, I encountered an error summarizing your notes. Please try again.",
            sender: 'ai',
            timestamp: new Date().toISOString()
          }
        ];
      });
    } finally {
      setIsTyping(false);
      setIsProcessing(false);
    }
  };

  // Save AI response as a note
  const handleSaveAsNote = (content: string) => {
    // Extract a title from the content (first few words)
    const titleMatch = content.match(/^# (.+)$/m) || content.match(/^(.{1,50})\b/);
    const title = titleMatch ? titleMatch[1] : 'AI Generated Note';

    // Create a new note
    const newNote = addNote({
      title,
      content,
      isPinned: false,
      tags: []
    });

    toast({
      title: "Note Created",
      description: `"${title}" has been added to your notes.`
    });

    return newNote;
  };

  // Format Mood Board data for AI context
  const formatMoodBoardData = (moodBoardIds: string[] = []) => {
    // If no specific mood boards are selected, use all mood boards
    const boardsToFormat = moodBoardIds.length > 0
      ? moodBoards.filter(board => moodBoardIds.includes(board.id))
      : moodBoards;

    if (boardsToFormat.length === 0) return '';

    let formattedData = '## Mood Boards\n\n';

    boardsToFormat.forEach(board => {
      formattedData += `### ${board.name}\n\n`;

      // Group items by type
      const textItems = board.items.filter(item => item.type === 'text');
      const imageItems = board.items.filter(item => item.type === 'image');

      if (textItems.length > 0) {
        formattedData += '#### Text Items:\n';
        textItems.forEach(item => {
          formattedData += `- ${item.content}\n`;
        });
        formattedData += '\n';
      }

      if (imageItems.length > 0) {
        formattedData += '#### Image Items:\n';
        formattedData += `- ${imageItems.length} images are present in this mood board\n`;
        formattedData += '\n';
      }
    });

    return formattedData;
  };

  // Format Constellation View data for AI context
  const formatConstellationData = (similarityThreshold: number = 0.3) => {
    if (notes.length < 2) return '';

    // Calculate similarities between notes
    const similarities = calculateNoteSimilarity(notes);

    // Find relationships above the threshold
    const relationships: {sourceId: string, targetId: string, strength: number}[] = [];

    Object.keys(similarities).forEach(sourceId => {
      Object.keys(similarities[sourceId]).forEach(targetId => {
        const strength = similarities[sourceId][targetId];

        if (strength >= similarityThreshold) {
          relationships.push({
            sourceId,
            targetId,
            strength
          });
        }
      });
    });

    if (relationships.length === 0) return '';

    let formattedData = '## Constellation View (Note Relationships)\n\n';

    // Format relationships
    formattedData += '### Content Similarities:\n';

    relationships.forEach(rel => {
      const sourceNote = notes.find(note => note.id === rel.sourceId);
      const targetNote = notes.find(note => note.id === rel.targetId);

      if (sourceNote && targetNote) {
        formattedData += `- "${sourceNote.title}" is related to "${targetNote.title}" (similarity: ${(rel.strength * 100).toFixed(0)}%)\n`;
      }
    });

    // Add tag relationships
    formattedData += '\n### Tag Relationships:\n';

    // Group notes by tag
    tags.forEach(tag => {
      const notesWithTag = notes.filter(note => note.tags.some(t => t.id === tag.id));

      if (notesWithTag.length > 1) {
        formattedData += `- Tag "${tag.name}" connects these notes: ${notesWithTag.map(n => `"${n.title}"`).join(', ')}\n`;
      }
    });

    return formattedData;
  };

  // Format Calendar data for AI context
  const formatCalendarData = (startDate?: Date, endDate?: Date) => {
    // If no date range is provided, use the current month
    if (!startDate) {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (!endDate) {
      // If only start date is provided, use a 30-day range
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
    }

    // Filter notes that are within the date range and likely to be events
    // We'll consider notes with a specific time (hours/minutes set) as events
    const events = notes.filter(note => {
      const noteDate = new Date(note.createdAt);

      // Check if the note is within the date range
      const isInRange = noteDate >= startDate! && noteDate <= endDate!;

      // Check if the note has a specific time (not midnight)
      const hasSpecificTime = noteDate.getHours() !== 0 || noteDate.getMinutes() !== 0;

      return isInRange && hasSpecificTime;
    });

    if (events.length === 0) return '';

    let formattedData = '## Calendar Events\n\n';

    // Group events by date
    const eventsByDate: Record<string, Note[]> = {};

    events.forEach(event => {
      const eventDate = new Date(event.createdAt);
      const dateKey = eventDate.toISOString().split('T')[0];

      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }

      eventsByDate[dateKey].push(event);
    });

    // Format events by date
    Object.keys(eventsByDate).sort().forEach(dateKey => {
      const date = new Date(dateKey);
      formattedData += `### ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}\n`;

      // Sort events by time
      const sortedEvents = eventsByDate[dateKey].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      sortedEvents.forEach(event => {
        const eventTime = new Date(event.createdAt);
        const timeString = eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        formattedData += `- **${timeString}**: ${event.title}\n`;

        // Add event description if available
        if (event.content.trim()) {
          // Extract the first line or first 100 characters, whichever is shorter
          const description = event.content.split('\n')[0].substring(0, 100);
          formattedData += `  ${description}${description.length === 100 ? '...' : ''}\n`;
        }

        // Add tags if available
        if (event.tags.length > 0) {
          formattedData += `  Tags: ${event.tags.map(tag => tag.name).join(', ')}\n`;
        }

        formattedData += '\n';
      });
    });

    return formattedData;
  };

  // Analyze connections between notes, mood boards, and constellation view
  const handleAnalyzeConnections = async () => {
    if ((moodBoards.length === 0 && notes.length < 2)) {
      toast({
        title: "Not enough content to analyze",
        description: "You need at least 2 notes or 1 mood board to analyze connections.",
        variant: "destructive"
      });
      return;
    }

    setIsTyping(true);
    setIsProcessing(true);

    try {
      // Format mood board data
      const moodBoardContent = formatMoodBoardData(selectedMoodBoards.length > 0 ? selectedMoodBoards : moodBoards.map(board => board.id));

      // Format constellation data
      const constellationContent = formatConstellationData(constellationSimilarityThreshold);

      // Create a prompt for analyzing connections
      const prompt = `
I'd like you to analyze the connections and relationships between my content in Notara.

${moodBoardContent}

${constellationContent}

Please provide insights on:
1. Common themes and patterns across my content
2. Interesting connections between different elements
3. Potential areas for further exploration
4. Any recommendations based on the connections you see

Focus on finding meaningful relationships and insights rather than just summarizing the content.
`;

      // Initialize response message with empty content
      const newMessageId = uuidv4();
      currentMessageId.current = newMessageId;

      setMessages(prev => [...prev, {
        id: newMessageId,
        content: '',
        sender: 'ai',
        timestamp: new Date().toISOString()
      }]);

      // Send request to API
      await streamChatCompletion(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        handleStreamChunk
      );

      toast({
        title: "Analysis Complete",
        description: "An analysis of your content connections has been created."
      });
    } catch (error) {
      console.error("Error analyzing connections:", error);

      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.sender === 'ai' && last.content === '') {
          return [
            ...prev.slice(0, -1),
            {
              id: uuidv4(),
              content: "I'm sorry, I encountered an error analyzing your content connections. Please try again.",
              sender: 'ai',
              timestamp: new Date().toISOString()
            }
          ];
        }
        return [
          ...prev,
          {
            id: uuidv4(),
            content: "I'm sorry, I encountered an error analyzing your content connections. Please try again.",
            sender: 'ai',
            timestamp: new Date().toISOString()
          }
        ];
      });
    } finally {
      setIsTyping(false);
      setIsProcessing(false);
    }
  };

  // Generate image
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isProcessing) {
      toast({
        title: "No prompt provided",
        description: "Please enter a description for the image you want to generate.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create request for image
      const prompt = imagePrompt;
      const { width, height } = imageSize;
      const seed = Math.floor(Math.random() * 1000); // Random seed for each generation

      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&noLogo=${API_CONFIG.noLogo}&model=${API_CONFIG.imageModel}`;

      // Add image message
      const imageMessage: Message = {
        id: uuidv4(),
        content: `Generated image for prompt: "${prompt}"`,
        sender: 'ai',
        timestamp: new Date().toISOString(),
        imageUrl: imageUrl
      };

      setMessages(prev => [...prev, imageMessage]);
      setImagePrompt('');
      setShowImagePrompt(false);

      toast({
        title: "Image Generated",
        description: "Your image has been generated."
      });
    } catch (error) {
      console.error("Error generating image:", error);

      toast({
        title: "Image Generation Failed",
        description: "There was an error generating your image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // SummaryOptionsDialog component
  const SummaryOptionsDialog = () => {
    // Use local state to avoid flashing when changing options
    const [localSummaryMode, setLocalSummaryMode] = useState<'all' | 'selected' | 'new' | 'related'>(summaryMode);
    const [localSelectedSummaryType, setLocalSelectedSummaryType] = useState<string>(selectedSummaryType);
    const [localGroupByTags, setLocalGroupByTags] = useState<boolean>(groupByTags);
    const [localSelectedNotes, setLocalSelectedNotes] = useState<NoteSelection[]>([]);
    const [localIncludeMoodBoards, setLocalIncludeMoodBoards] = useState<boolean>(includeMoodBoards);
    const [localIncludeConstellationView, setLocalIncludeConstellationView] = useState<boolean>(includeConstellationView);
    const [localSelectedMoodBoards, setLocalSelectedMoodBoards] = useState<string[]>(selectedMoodBoards);
    const [localConstellationSimilarityThreshold, setLocalConstellationSimilarityThreshold] = useState<number>(constellationSimilarityThreshold);

    // Sync local state with parent state when dialog opens
    useEffect(() => {
      if (showSummaryOptions) {
        setLocalSummaryMode(summaryMode);
        setLocalSelectedSummaryType(selectedSummaryType);
        setLocalGroupByTags(groupByTags);
        setLocalSelectedNotes(selectedNotes);
        setLocalIncludeMoodBoards(includeMoodBoards);
        setLocalIncludeConstellationView(includeConstellationView);
        setLocalSelectedMoodBoards(selectedMoodBoards);
        setLocalConstellationSimilarityThreshold(constellationSimilarityThreshold);
      }
    }, [showSummaryOptions, summaryMode, selectedSummaryType, groupByTags, selectedNotes,
        includeMoodBoards, includeConstellationView, selectedMoodBoards, constellationSimilarityThreshold]);

    // Apply changes to parent state only when needed
    const applyChanges = () => {
      setSummaryMode(localSummaryMode);
      setSelectedSummaryType(localSelectedSummaryType);
      setGroupByTags(localGroupByTags);
      setSelectedNotes(localSelectedNotes);
      setIncludeMoodBoards(localIncludeMoodBoards);
      setIncludeConstellationView(localIncludeConstellationView);
      setSelectedMoodBoards(localSelectedMoodBoards);
      setConstellationSimilarityThreshold(localConstellationSimilarityThreshold);
    };

    // Handle dialog close
    const handleOpenChange = (open: boolean) => {
      if (!open) {
        // Apply changes before closing
        applyChanges();
      }
      setShowSummaryOptions(open);
    };

    if (!showSummaryOptions) return null;

    return (
      <Dialog open={showSummaryOptions} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-md border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Summarize Notes</DialogTitle>
            <DialogDescription>
              Configure how you want your notes to be summarized.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Summary Mode Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Summary Mode</Label>
              <RadioGroup value={localSummaryMode} onValueChange={(value) => setLocalSummaryMode(value as 'all' | 'selected' | 'new' | 'related')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">All Notes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" />
                  <Label htmlFor="selected">Selected Notes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new">New/Changed Notes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="related" id="related" />
                  <Label htmlFor="related">Related Notes</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Summary Type Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Summary Type</Label>
              <Select value={localSelectedSummaryType} onValueChange={setLocalSelectedSummaryType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a summary type" />
                </SelectTrigger>
                <SelectContent>
                  {summaryTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex flex-col">
                        <span>{type.name}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Note Selection (when in 'selected' or 'related' mode) */}
            {(localSummaryMode === 'selected' || localSummaryMode === 'related') && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Select Notes</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalSelectedNotes(prev => prev.map(note => ({ ...note, selected: true })))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocalSelectedNotes(prev => prev.map(note => ({ ...note, selected: false })))}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                  {notes.map(note => {
                    const selected = localSelectedNotes.find(s => s.id === note.id);
                    return (
                      <div key={note.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`note-${note.id}`}
                          checked={selected?.selected || false}
                          onCheckedChange={(checked) => {
                            setLocalSelectedNotes(prev => prev.map(s =>
                              s.id === note.id ? { ...s, selected: !!checked } : s
                            ));
                          }}
                        />
                        <Label htmlFor={`note-${note.id}`} className="flex-1 truncate">
                          {note.title}
                        </Label>
                        {selected?.lastSummarized && (
                          <span className="text-xs text-muted-foreground">
                            Last summarized: {new Date(selected.lastSummarized).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grouping Options (when in 'all' mode) */}
            {localSummaryMode === 'all' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="group-by-tags"
                  checked={localGroupByTags}
                  onCheckedChange={(checked) => setLocalGroupByTags(!!checked)}
                />
                <Label htmlFor="group-by-tags">Group by tags</Label>
              </div>
            )}

            {/* Additional Context Options */}
            <div className="space-y-4 pt-4 border-t border-border/30">
              <h3 className="text-sm font-medium">Additional Context</h3>

              {/* Mood Board Options */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-moodboards"
                    checked={localIncludeMoodBoards}
                    onCheckedChange={(checked) => setLocalIncludeMoodBoards(!!checked)}
                  />
                  <Label htmlFor="include-moodboards">Include Mood Boards</Label>
                </div>

                {localIncludeMoodBoards && moodBoards.length > 0 && (
                  <div className="pl-6 space-y-2">
                    <Label className="text-xs">Select Mood Boards</Label>
                    <div className="max-h-[150px] overflow-y-auto space-y-1 pr-2">
                      {moodBoards.map(board => (
                        <div key={board.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`moodboard-${board.id}`}
                            checked={localSelectedMoodBoards.includes(board.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setLocalSelectedMoodBoards(prev => [...prev, board.id]);
                              } else {
                                setLocalSelectedMoodBoards(prev => prev.filter(id => id !== board.id));
                              }
                            }}
                          />
                          <Label htmlFor={`moodboard-${board.id}`} className="text-sm">
                            {board.name}
                          </Label>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocalSelectedMoodBoards(moodBoards.map(board => board.id))}
                        className="text-xs py-0 h-7"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocalSelectedMoodBoards([])}
                        className="text-xs py-0 h-7"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Constellation View Options */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-constellation"
                    checked={localIncludeConstellationView}
                    onCheckedChange={(checked) => setLocalIncludeConstellationView(!!checked)}
                  />
                  <Label htmlFor="include-constellation">Include Constellation View</Label>
                </div>

                {localIncludeConstellationView && (
                  <div className="pl-6 space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">Similarity Threshold</Label>
                        <span className="text-xs w-8 text-right">{(localConstellationSimilarityThreshold * 100).toFixed(0)}%</span>
                      </div>

                      <Slider
                        value={[localConstellationSimilarityThreshold]}
                        min={0.1}
                        max={0.9}
                        step={0.05}
                        onValueChange={(value) => setLocalConstellationSimilarityThreshold(value[0])}
                        className="w-full"
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Higher threshold = fewer but stronger connections
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary History Button */}
            {summaryHistory.length > 0 && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowSummaryOptions(false);
                    setShowSummaryHistory(true);
                  }}
                  className="w-full"
                >
                  <History className="w-4 h-4 mr-2" />
                  View Previous Summaries ({summaryHistory.length})
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummaryOptions(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                // Apply changes first
                applyChanges();
                // Close the dialog immediately before starting the summarization
                setShowSummaryOptions(false);
                // Then start the summarization process
                setTimeout(() => {
                  handleSummarizeNotes();
                }, 100);
              }}
              disabled={
                (localSummaryMode === 'selected' || localSummaryMode === 'related') &&
                !localSelectedNotes.some(note => note.selected)
              }
            >
              Summarize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // SummaryHistoryDialog component
  const SummaryHistoryDialog = () => {
    const [selectedSummary, setSelectedSummary] = useState<SummaryHistory | null>(null);

    if (!showSummaryHistory) return null;

    return (
      <Dialog open={showSummaryHistory} onOpenChange={setShowSummaryHistory}>
        <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-md border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Summary History</DialogTitle>
            <DialogDescription>
              View your previous note summaries.
            </DialogDescription>
          </DialogHeader>

          <div className="flex h-[400px] gap-4">
            {/* Summary List */}
            <div className="w-1/3 border-r border-border/50 pr-4 overflow-y-auto">
              {summaryHistory.map(summary => {
                const summaryType = summaryTypes.find(type => type.id === summary.summaryType);
                return (
                  <div
                    key={summary.id}
                    className={`p-2 rounded-md cursor-pointer hover:bg-primary/10 transition-colors mb-2 ${
                      selectedSummary?.id === summary.id ? 'bg-primary/20' : ''
                    }`}
                    onClick={() => setSelectedSummary(summary)}
                  >
                    <div className="font-medium">{summaryType?.name || 'Summary'}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(summary.timestamp).toLocaleString()}
                    </div>
                    <div className="text-xs mt-1">
                      {summary.noteIds.length} notes
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Content */}
            <div className="flex-1 overflow-y-auto">
              {selectedSummary ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{selectedSummary.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a summary to view
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            {selectedSummary && (
              <Button
                variant="outline"
                onClick={() => {
                  // Add the selected summary as a message
                  setMessages(prev => [
                    ...prev,
                    {
                      id: uuidv4(),
                      content: selectedSummary.content,
                      sender: 'ai',
                      timestamp: new Date().toISOString()
                    }
                  ]);
                  setShowSummaryHistory(false);
                }}
              >
                Add to Chat
              </Button>
            )}
            <Button
              variant="default"
              onClick={() => setShowSummaryHistory(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card relative overflow-hidden">
      {/* Cosmic background effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="star absolute animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                backgroundColor: 'currentColor',
                borderRadius: '50%',
                animationDuration: `${Math.random() * 3 + 1}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Summary Dialogs */}
      <SummaryOptionsDialog />
      <SummaryHistoryDialog />

      <div className="p-4 border-b border-border/50 backdrop-blur-sm bg-card/30 flex items-center gap-2 z-10">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">AI Assistant</h2>
        <div className="ml-auto px-2 py-1 text-xs bg-primary/20 rounded-full text-primary font-mono">
          GPT-4.1
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 z-10" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-white cosmic-glow'
                  : 'bg-secondary/80 backdrop-blur-md text-secondary-foreground'
              }`}
            >
              <div className="prose prose-sm dark:prose-invert transition-all duration-200">
                {message.content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i !== message.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}

                {message.imageUrl && (
                  <div className="mt-3">
                    <img
                      src={message.imageUrl}
                      alt="Generated"
                      className="max-w-full rounded-md shadow-lg border border-border/50"
                    />
                    <div className="flex justify-end mt-2">
                      <a
                        href={message.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                        download
                      >
                        Download Image
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {message.sender === 'ai' && message.content && (
                <div className="flex justify-end mt-2 gap-2">
                  <button
                    onClick={() => handleSaveAsNote(message.content)}
                    className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <FileText className="w-3 h-3" /> Save as note
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-secondary/80 backdrop-blur-sm text-secondary-foreground px-4 py-2 rounded-lg shadow-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border/50 bg-card/70 backdrop-blur-md z-10">
        <div className="flex flex-wrap gap-2 mb-3">
          <Button
            variant="cosmic"
            size="sm"
            onClick={handleGenerateFocusPrompt}
            disabled={isProcessing}
            className="text-xs gap-1 transition-all hover:scale-105 btn-glow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L7 7.5V13l-2 1.5L10 21.5l5-7 5 7 5-7-5-7 5-7L12 2z"/></svg>
            Generate Focus Prompt
          </Button>
          <Button
            variant="cosmic"
            size="sm"
            onClick={handleSummarizeNotes}
            disabled={isProcessing}
            className="text-xs gap-1 transition-all hover:scale-105 btn-glow"
          >
            <FileText className="w-3 h-3" />
            Summarize Notes
          </Button>
          <Button
            variant="cosmic"
            size="sm"
            onClick={handleAnalyzeConnections}
            disabled={isProcessing || (moodBoards.length === 0 && notes.length < 2)}
            className="text-xs gap-1 transition-all hover:scale-105 btn-glow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            Analyze Connections
          </Button>
          <Button
            variant="cosmic"
            size="sm"
            onClick={() => setShowImagePrompt(!showImagePrompt)}
            disabled={isProcessing}
            className="text-xs gap-1 transition-all hover:scale-105 btn-glow"
          >
            <ImageIcon className="w-3 h-3" />
            Generate Image
          </Button>
        </div>

        {showImagePrompt && (
          <div className="mb-3 p-3 border border-border/50 rounded-md bg-background/50 backdrop-blur-sm animate-slide-down">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe the image you want to generate..."
                  className="resize-none flex-1 bg-background/50"
                  rows={2}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleGenerateImage}
                    disabled={isProcessing || !imagePrompt.trim()}
                    size="sm"
                    className="cosmic-glow"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setShowImagePrompt(false)}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-4 items-center text-xs">
                <div className="flex gap-2 items-center">
                  <span className="text-muted-foreground">Size:</span>
                  <select
                    value={`${imageSize.width}x${imageSize.height}`}
                    onChange={(e) => {
                      const [width, height] = e.target.value.split('x').map(Number);
                      setImageSize({ width, height });
                    }}
                    className="bg-background/50 border border-border/50 rounded p-1"
                  >
                    <option value="512x512">512 × 512</option>
                    <option value="768x768">768 × 768</option>
                    <option value="1024x1024">1024 × 1024</option>
                    <option value="1024x768">1024 × 768</option>
                    <option value="768x1024">768 × 1024</option>
                  </select>
                </div>
                <div className="text-muted-foreground">
                  Model: <span className="text-primary font-mono">flux</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="resize-none bg-background/50 border-border/50 focus:border-primary transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isProcessing || !inputMessage.trim()}
            className="cosmic-glow transition-transform hover:scale-105"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;
