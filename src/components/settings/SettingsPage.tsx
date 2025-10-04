import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ExternalLink, Share2, Download, ArrowLeft, X, Plus, Trash2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTheme } from '@/context/ThemeContext';
import { useNotes } from '@/context/NotesContextTypes';
import type { NoteTag } from '@/types';

const SettingsPage: React.FC = () => {
  const [autoSave, setAutoSave] = useState(true);
  const [spellCheck, setSpellCheck] = useState(true);
  const [exportFormat, setExportFormat] = useState('markdown');
  const { settings, setThemeMode, setAccentColor, setFontSize, setAnimations, resetToDefaults, availableThemes, availableAccentColors } = useTheme();
  const { tags, notes, addTag, updateTag, deleteTag } = useNotes();
  const navigate = useNavigate();

  const [draftTags, setDraftTags] = useState<NoteTag[]>(() => tags.map(tag => ({ ...tag })));
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#9b87f5');

  useEffect(() => {
    setDraftTags(tags.map(tag => ({ ...tag })));
  }, [tags]);

  const notesPerTag = useMemo(() => {
    const usage = new Map<string, number>();
    tags.forEach(tag => usage.set(tag.id, 0));
    notes.forEach(note => {
      note.tags.forEach(tag => {
        usage.set(tag.id, (usage.get(tag.id) ?? 0) + 1);
      });
    });
    return usage;
  }, [notes, tags]);

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been updated successfully."
    });
    // Navigate back to previous page after a short delay
    setTimeout(() => {
      navigate(-1);
    }, 1000);
  };

  const handleResetSettings = () => {
    resetToDefaults();
    setAutoSave(true);
    setSpellCheck(true);
    setExportFormat('markdown');
  };

  const handleExportData = () => {
    toast({
      title: "Export successful",
      description: `Your data has been exported in ${exportFormat} format.`
    });
  };

  const handleShareApp = () => {
    navigator.clipboard.writeText(window.location.origin);
    toast({
      title: "Link copied",
      description: "App link copied to clipboard"
    });
  };

  const handleIntegrationPlaceholder = (service: string) => {
    toast({
      title: `${service} integration`,
      description: 'Coming soon. Local-only mode is enabled for now.'
    });
  };

  const isValidHexColor = (value: string) => /^#([0-9a-fA-F]{6})$/.test(value);

  const handleDraftChange = (id: string, field: 'name' | 'color', value: string) => {
    setDraftTags((prev) => prev.map((tag) => (tag.id === id ? { ...tag, [field]: value } : tag)));
  };

  const handleSaveTag = (id: string) => {
    const draft = draftTags.find((tag) => tag.id === id);
    if (!draft) return;

    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      toast({
        title: 'Tag name required',
        description: 'Please provide a name before saving.',
        variant: 'destructive',
      });
      return;
    }

    const colorValue = draft.color.startsWith('#') ? draft.color : `#${draft.color}`;
    if (!isValidHexColor(colorValue)) {
      toast({
        title: 'Invalid color',
        description: 'Please use a full hex color like #4f46e5.',
        variant: 'destructive',
      });
      return;
    }

    updateTag(id, { name: trimmedName, color: colorValue.toLowerCase() });
    toast({
      title: 'Tag updated',
      description: 'We saved your changes to this tag.',
    });
  };

  const handleDeleteTagSetting = (id: string) => {
    const tagName = tags.find((tag) => tag.id === id)?.name ?? 'tag';
    if (!window.confirm(`Delete “${tagName}”? This removes it from every note.`)) {
      return;
    }
    deleteTag(id);
    toast({
      title: 'Tag removed',
      description: `“${tagName}” will no longer appear on your notes.`,
    });
  };

  const handleAddTag = () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) {
      toast({
        title: 'Tag name required',
        description: 'Give your tag a name before adding it.',
        variant: 'destructive',
      });
      return;
    }

    const colorValue = newTagColor.startsWith('#') ? newTagColor : `#${newTagColor}`;
    if (!isValidHexColor(colorValue)) {
      toast({
        title: 'Invalid color',
        description: 'Please provide a full hex value like #22d3ee.',
        variant: 'destructive',
      });
      return;
    }

    addTag({ name: trimmedName, color: colorValue.toLowerCase() });
    setNewTagName('');
    setNewTagColor('#9b87f5');
    toast({
      title: 'Tag created',
      description: `“${trimmedName}” is ready to use.`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="hover:bg-secondary/50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="hover:bg-secondary/50 transition-colors"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>Customize how Notara looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Theme Selection</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {availableThemes.map((theme) => (
                      <div
                        key={theme.mode}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                          settings.mode === theme.mode 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setThemeMode(theme.mode)}
                      >
                        <div 
                          className="w-full h-12 rounded-md mb-2" 
                          style={{ background: theme.preview }}
                        />
                        <h4 className="font-medium text-sm">{theme.name}</h4>
                        <p className="text-xs text-muted-foreground">{theme.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Accent Color</Label>
                  <div className="flex gap-3">
                    {availableAccentColors.map((color) => (
                      <div
                        key={color.color}
                        className={`w-8 h-8 rounded-full cursor-pointer border-2 transition-all hover:scale-110 ${
                          settings.accentColor === color.color
                            ? 'border-white shadow-lg'
                            : 'border-border'
                        }`}
                        style={{ backgroundColor: color.hexValue }}
                        onClick={() => setAccentColor(color.color)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size</Label>
                  <Select value={settings.fontSize} onValueChange={setFontSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select font size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="animations">Enable Animations</Label>
                  <Switch 
                    id="animations" 
                    checked={settings.animations} 
                    onCheckedChange={setAnimations} 
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleResetSettings}>Reset</Button>
                <Button onClick={handleSaveSettings}>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="editor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Editor Settings</CardTitle>
                <CardDescription>Customize your writing experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autosave">Auto Save</Label>
                  <Switch 
                    id="autosave" 
                    checked={autoSave} 
                    onCheckedChange={setAutoSave} 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="spellcheck">Spell Check</Label>
                  <Switch 
                    id="spellcheck" 
                    checked={spellCheck} 
                    onCheckedChange={setSpellCheck} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="markdown-preview">Live Markdown Preview</Label>
                  <Switch id="markdown-preview" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="line-numbers">Show Line Numbers</Label>
                  <Switch id="line-numbers" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleResetSettings}>Reset</Button>
                <Button onClick={handleSaveSettings}>Save Changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="tags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manage Tags</CardTitle>
                <CardDescription>Create, rename, recolor, or remove your markdown tags.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <Label htmlFor="new-tag-name">Tag name</Label>
                    <Input
                      id="new-tag-name"
                      value={newTagName}
                      onChange={(event) => setNewTagName(event.target.value)}
                      placeholder="Design, Meeting, Reference…"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="new-tag-color">Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="new-tag-color"
                        type="color"
                        value={newTagColor}
                        onChange={(event) => setNewTagColor(event.target.value)}
                        className="h-10 w-10 cursor-pointer rounded-md border border-border"
                        aria-label="Pick tag color"
                      />
                      <Input
                        value={newTagColor}
                        onChange={(event) => setNewTagColor(event.target.value)}
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddTag} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Tag
                  </Button>
                </div>

                <Separator />

                {draftTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags yet. Create your first tag above.</p>
                ) : (
                  <div className="space-y-3">
                    {draftTags.map((tag) => {
                      const usageCount = notesPerTag.get(tag.id) ?? 0;

                      return (
                        <div
                          key={tag.id}
                          className="rounded-md border border-border/40 bg-card/40 p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[220px]">
                              <span
                                className="h-8 w-8 rounded-full border border-border"
                                style={{ backgroundColor: tag.color }}
                                aria-hidden="true"
                              />
                              <div className="flex-1 min-w-[160px]">
                                <Label htmlFor={`tag-name-${tag.id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Name
                                </Label>
                                <Input
                                  id={`tag-name-${tag.id}`}
                                  value={tag.name}
                                  onChange={(event) => handleDraftChange(tag.id, 'name', event.target.value)}
                                  placeholder="Tag name"
                                  className="mt-1"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <Label htmlFor={`tag-color-${tag.id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
                                Color
                              </Label>
                              <div className="flex items-center gap-2">
                                <input
                                  id={`tag-color-${tag.id}`}
                                  type="color"
                                  value={tag.color}
                                  onChange={(event) => handleDraftChange(tag.id, 'color', event.target.value)}
                                  className="h-10 w-10 cursor-pointer rounded-md border border-border"
                                  aria-label={`Pick a color for ${tag.name}`}
                                />
                                <Input
                                  value={tag.color}
                                  onChange={(event) => handleDraftChange(tag.id, 'color', event.target.value)}
                                  maxLength={7}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 lg:flex-col lg:items-end lg:gap-2">
                              <span className="text-xs text-muted-foreground">
                                {usageCount} note{usageCount === 1 ? '' : 's'} using this tag
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleSaveTag(tag.id)}
                                  aria-label={`Save changes to ${tag.name}`}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteTagSetting(tag.id)}
                                  aria-label={`Delete ${tag.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>External Integrations</CardTitle>
                <CardDescription>Integrations will arrive once shared workspaces are ready.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">GitHub</h3>
                      <p className="text-sm text-muted-foreground">Sync notes with repositories (planned)</p>
                    </div>
                    <Button 
                      onClick={() => handleIntegrationPlaceholder('GitHub')} 
                      variant="outline" 
                      className="flex items-center gap-2"
                    >
                      <ExternalLink size={16} />
                      Coming Soon
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Google Drive</h3>
                      <p className="text-sm text-muted-foreground">Back up notes to Google Drive (planned)</p>
                    </div>
                    <Button onClick={() => handleIntegrationPlaceholder('Google Drive')} variant="outline" className="flex items-center gap-2">
                      <ExternalLink size={16} />
                      Coming Soon
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Dropbox</h3>
                      <p className="text-sm text-muted-foreground">Sync notes with Dropbox (planned)</p>
                    </div>
                    <Button onClick={() => handleIntegrationPlaceholder('Dropbox')} variant="outline" className="flex items-center gap-2">
                      <ExternalLink size={16} />
                      Coming Soon
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Export Data</Label>
                  <div className="flex gap-2">
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="markdown">Markdown (.md)</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleExportData} className="flex items-center gap-2">
                      <Download size={16} />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>About Notara</CardTitle>
                <CardDescription>App information and links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-lg mb-2">Notara</h3>
                  <p className="text-muted-foreground">Version 1.0.0</p>
                  <p className="text-muted-foreground mt-4">
                    A beautiful note-taking app with a cosmic theme and powerful features.
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="font-medium">Share Notara</h3>
                  <Button onClick={handleShareApp} variant="outline" className="flex items-center gap-2">
                    <Share2 size={16} />
                    Copy Link
                  </Button>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h3 className="font-medium">Support</h3>
                  <div className="flex flex-col gap-2">
                    <Button variant="link" className="h-auto p-0 justify-start" asChild>
                      <a href="/markdown-cheatsheet" className="flex items-center gap-2">
                        <ExternalLink size={14} />
                        Markdown Cheatsheet
                      </a>
                    </Button>
                    <Button variant="link" className="h-auto p-0 justify-start" asChild>
                      <a href="#" className="flex items-center gap-2">
                        <ExternalLink size={14} />
                        Report an Issue
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()} Notara. All rights reserved.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
