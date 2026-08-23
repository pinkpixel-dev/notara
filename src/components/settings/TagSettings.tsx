import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNotes } from '@/context/NotesContextTypes';
import { toast } from '@/hooks/use-toast';
import type { NoteTag } from '@/types';

const isValidHexColor = (value: string) => /^#([0-9a-fA-F]{6})$/.test(value);

export const TagSettings = () => {
  const { tags, notes, addTag, updateTag, deleteTag } = useNotes();
  const [draftTags, setDraftTags] = useState<NoteTag[]>(() => tags.map((tag) => ({ ...tag })));
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#9b87f5');

  useEffect(() => setDraftTags(tags.map((tag) => ({ ...tag }))), [tags]);

  const notesPerTag = useMemo(() => {
    const usage = new Map<string, number>();
    tags.forEach((tag) => usage.set(tag.id, 0));
    notes.forEach((note) => note.tags.forEach((tag) => usage.set(tag.id, (usage.get(tag.id) ?? 0) + 1)));
    return usage;
  }, [notes, tags]);

  const handleDraftChange = (id: string, field: 'name' | 'color', value: string) => {
    setDraftTags((previous) => previous.map((tag) => (tag.id === id ? { ...tag, [field]: value } : tag)));
  };

  const handleSaveTag = (id: string) => {
    const draft = draftTags.find((tag) => tag.id === id);
    if (!draft) return;
    const name = draft.name.trim();
    const color = draft.color.startsWith('#') ? draft.color : `#${draft.color}`;
    if (!name) {
      toast({ title: 'Tag name required', description: 'Please provide a name before saving.', variant: 'destructive' });
      return;
    }
    if (!isValidHexColor(color)) {
      toast({ title: 'Invalid color', description: 'Please use a full hex color like #4f46e5.', variant: 'destructive' });
      return;
    }
    updateTag(id, { name, color: color.toLowerCase() });
    toast({ title: 'Tag updated', description: 'We saved your changes to this tag.' });
  };

  const handleDeleteTag = async (id: string) => {
    const name = tags.find((tag) => tag.id === id)?.name ?? 'tag';
    if (!window.confirm(`Delete “${name}”? This removes it from every note.`)) return;

    // Removing a tag rewrites every note file that carried it, so the toast
    // waits for those writes rather than announcing a result it cannot see.
    try {
      await deleteTag(id);
      toast({ title: 'Tag removed', description: `“${name}” will no longer appear on your notes.` });
    } catch (error) {
      console.error('Failed to remove the tag', error);
      toast({
        title: 'Could not remove the tag',
        description: error instanceof Error ? error.message : 'Some notes could not be updated.',
        variant: 'destructive',
      });
    }
  };

  const handleAddTag = () => {
    const name = newTagName.trim();
    const color = newTagColor.startsWith('#') ? newTagColor : `#${newTagColor}`;
    if (!name) {
      toast({ title: 'Tag name required', description: 'Give your tag a name before adding it.', variant: 'destructive' });
      return;
    }
    if (!isValidHexColor(color)) {
      toast({ title: 'Invalid color', description: 'Please provide a full hex value like #22d3ee.', variant: 'destructive' });
      return;
    }
    addTag({ name, color: color.toLowerCase() });
    setNewTagName('');
    setNewTagColor('#9b87f5');
    toast({ title: 'Tag created', description: `“${name}” is ready to use.` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Tags</CardTitle>
        <CardDescription>Create, rename, recolor, or remove your Markdown tags.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="new-tag-name">Tag name</Label>
            <Input id="new-tag-name" value={newTagName} onChange={(event) => setNewTagName(event.target.value)} placeholder="Design, Meeting, Reference…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-tag-color">Color</Label>
            <div className="flex items-center gap-2">
              <input id="new-tag-color" type="color" value={newTagColor} onChange={(event) => setNewTagColor(event.target.value)} className="h-10 w-10 cursor-pointer rounded-md border border-border" />
              <Input value={newTagColor} onChange={(event) => setNewTagColor(event.target.value)} maxLength={7} aria-label="New tag hex color" />
            </div>
          </div>
          <Button onClick={handleAddTag} className="gap-2"><Plus className="h-4 w-4" /> Add Tag</Button>
        </div>
        <Separator />
        {draftTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet. Create your first tag above.</p>
        ) : (
          <div className="space-y-3">
            {draftTags.map((tag) => {
              const usageCount = notesPerTag.get(tag.id) ?? 0;
              return (
                <div key={tag.id} className="rounded-md border border-border/40 bg-card/40 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                    <span className="mb-1 h-8 w-8 rounded-full border border-border" style={{ backgroundColor: tag.color }} aria-hidden="true" />
                    <div className="min-w-[160px] flex-1 space-y-1">
                      <Label htmlFor={`tag-name-${tag.id}`}>Name</Label>
                      <Input id={`tag-name-${tag.id}`} value={tag.name} onChange={(event) => handleDraftChange(tag.id, 'name', event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`tag-color-${tag.id}`}>Color</Label>
                      <div className="flex items-center gap-2">
                        <input id={`tag-color-${tag.id}`} type="color" value={tag.color} onChange={(event) => handleDraftChange(tag.id, 'color', event.target.value)} className="h-10 w-10 cursor-pointer rounded-md border border-border" />
                        <Input value={tag.color} onChange={(event) => handleDraftChange(tag.id, 'color', event.target.value)} maxLength={7} aria-label={`${tag.name} hex color`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 lg:flex-col lg:items-end">
                      <span className="text-xs text-muted-foreground">{usageCount} note{usageCount === 1 ? '' : 's'}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleSaveTag(tag.id)} aria-label={`Save changes to ${tag.name}`}><Save className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTag(tag.id)} aria-label={`Delete ${tag.name}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
