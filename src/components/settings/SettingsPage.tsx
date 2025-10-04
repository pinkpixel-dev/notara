import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Share2, Download, ArrowLeft, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTheme } from '@/context/ThemeContext';

const SettingsPage: React.FC = () => {
  const [autoSave, setAutoSave] = useState(true);
  const [spellCheck, setSpellCheck] = useState(true);
  const [exportFormat, setExportFormat] = useState('markdown');
  const { settings, setThemeMode, setAccentColor, setFontSize, setAnimations, resetToDefaults, availableThemes, availableAccentColors } = useTheme();
  const navigate = useNavigate();

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
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
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
