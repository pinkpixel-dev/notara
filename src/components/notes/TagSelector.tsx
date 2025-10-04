
import React, { useState } from 'react';
import { NoteTag } from '@/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TagSelectorProps {
  selectedTags: NoteTag[];
  onChange: (tags: NoteTag[]) => void;
  availableTags: NoteTag[];
}

const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  availableTags,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleTag = (tag: NoteTag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    
    if (isSelected) {
      onChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="px-3 py-1 text-sm rounded-md border border-border flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          {selectedTags.length === 0
            ? 'Tags'
            : selectedTags.length === 1
            ? `${selectedTags[0].name}`
            : `${selectedTags.length} tags`}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Select Tags</h4>
          <div className="grid grid-cols-2 gap-2">
            {availableTags.map(tag => {
              const isSelected = selectedTags.some(t => t.id === tag.id);
              
              return (
                <div
                  key={tag.id}
                  className={`p-2 rounded-md cursor-pointer flex items-center transition-colors ${
                    isSelected ? 'bg-secondary' : 'hover:bg-secondary/50'
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm">{tag.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TagSelector;
