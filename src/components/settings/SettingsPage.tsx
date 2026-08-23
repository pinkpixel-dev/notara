import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Share2, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { useTheme } from '@/context/ThemeContext';
import { APP_VERSION } from '@/lib/app-info';
import { AiDataSettings } from './AiDataSettings';
import { TagSettings } from './TagSettings';

const SettingsPage: React.FC = () => {
  const [autoSave, setAutoSave] = useState(true);
  const [spellCheck, setSpellCheck] = useState(true);
  const {
    settings, setThemeMode, setAccentColor, setFontSize, setAnimations,
    setGlassIntensity, resetToDefaults, availableThemes, availableAccentColors,
  } = useTheme();
  const navigate = useNavigate();

  const handleSaveSettings = () => {
    toast({ title: 'Settings saved', description: 'Your settings have been updated successfully.' });
    setTimeout(() => navigate(-1), 1000);
  };

  const handleResetSettings = () => {
    resetToDefaults();
    setAutoSave(true);
    setSpellCheck(true);
  };

  const handleShareApp = () => {
    navigator.clipboard.writeText(window.location.origin);
    toast({ title: 'Link copied', description: 'App link copied to clipboard' });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Close settings">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="ai-data">AI &amp; Data</TabsTrigger>
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {availableThemes.map((theme) => (
                        <button
                          type="button"
                          key={theme.mode}
                          className={`rounded-lg border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            settings.mode === theme.mode ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setThemeMode(theme.mode)}
                        >
                          <span className="mb-2 block h-12 w-full rounded-md" style={{ background: theme.preview }} />
                          <span className="block text-sm font-medium">{theme.name}</span>
                          <span className="block text-xs text-muted-foreground">{theme.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Accent Color</Label>
                    <div className="flex flex-wrap gap-3">
                      {availableAccentColors.map((color) => (
                        <button
                          type="button"
                          key={color.color}
                          className={`h-8 w-8 rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            settings.accentColor === color.color ? 'border-foreground' : 'border-border'
                          }`}
                          style={{ backgroundColor: color.hexValue }}
                          onClick={() => setAccentColor(color.color)}
                          title={color.name}
                          aria-label={`Use ${color.name} accent color`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="font-size">Font Size</Label>
                    <Select value={settings.fontSize} onValueChange={setFontSize}>
                      <SelectTrigger id="font-size"><SelectValue placeholder="Select font size" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="glass-intensity">Glass Intensity</Label>
                      <span className="text-xs text-muted-foreground">
                        {settings.glassIntensity === 0 ? 'Transparent' : settings.glassIntensity === 100 ? 'Frosted' : `${settings.glassIntensity}%`}
                      </span>
                    </div>
                    <Slider
                      id="glass-intensity" min={0} max={100} step={1}
                      value={[settings.glassIntensity]}
                      onValueChange={(value) => setGlassIntensity(value[0] ?? 0)}
                      aria-label="Glass intensity"
                    />
                    <p className="text-xs text-muted-foreground">Adjusts glass surfaces from transparent to frosted across the app.</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="animations">Enable Animations</Label>
                    <Switch id="animations" checked={settings.animations} onCheckedChange={setAnimations} />
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
                    <Switch id="autosave" checked={autoSave} onCheckedChange={setAutoSave} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="spellcheck">Spell Check</Label>
                    <Switch id="spellcheck" checked={spellCheck} onCheckedChange={setSpellCheck} />
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

            <TabsContent value="tags" className="space-y-4"><TagSettings /></TabsContent>
            <TabsContent value="ai-data" className="space-y-4"><AiDataSettings /></TabsContent>

            <TabsContent value="about" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>About Notara</CardTitle>
                  <CardDescription>App information and links</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-lg font-medium">Notara</h3>
                    <p className="text-muted-foreground">Version {APP_VERSION}</p>
                    <p className="mt-4 text-muted-foreground">A local-first note-taking app with Markdown editing, tasks, visual boards, and AI tools.</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-medium">Share Notara</h3>
                    <Button onClick={handleShareApp} variant="outline" className="flex items-center gap-2">
                      <Share2 size={16} /> Copy Link
                    </Button>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-medium">Support</h3>
                    <div className="flex flex-col gap-2">
                      <Button variant="link" className="h-auto justify-start p-0" asChild>
                        <a href="/markdown-cheatsheet" className="flex items-center gap-2"><ExternalLink size={14} /> Markdown Cheatsheet</a>
                      </Button>
                      <Button variant="link" className="h-auto justify-start p-0" asChild>
                        <a href="https://github.com/pinkpixel-dev/notara/issues" className="flex items-center gap-2"><ExternalLink size={14} /> Report an Issue</a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Pink Pixel. Licensed under Apache-2.0.</p>
                </CardFooter>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
