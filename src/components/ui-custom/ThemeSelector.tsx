import React, { useState } from 'react';
import { useTheme, type ThemeMode, type AccentColor, type VisualizationMode } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Monitor, 
  Sun, 
  Moon, 
  Sparkles, 
  Network, 
  GitGraph,
  Zap,
  ZapOff,
  Type,
  Download,
  Upload,
  RotateCcw,
  Check,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeSelectorProps {
  className?: string;
  showAdvanced?: boolean;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ 
  className,
  showAdvanced = true 
}) => {
  const { 
    settings, 
    setThemeMode, 
    setAccentColor, 
    setVisualizationMode,
    setAnimations,
    setFontSize,
    resetToDefaults,
    exportSettings,
    importSettings,
    availableThemes,
    availableAccentColors 
  } = useTheme();

  const [previewMode, setPreviewMode] = useState<ThemeMode | null>(null);
  const [importData, setImportData] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleImport = () => {
    if (importSettings(importData)) {
      setImportData('');
      setShowImport(false);
    }
  };

  const handleExport = () => {
    const data = exportSettings();
    navigator.clipboard.writeText(data);
  };

  const getThemeIcon = (mode: ThemeMode) => {
    switch (mode) {
      case 'cosmic': return <Sparkles className="h-4 w-4" />;
      case 'minimal-light': return <Sun className="h-4 w-4" />;
      case 'midnight-modern': return <Moon className="h-4 w-4" />;
      case 'frosted-glass': return <Monitor className="h-4 w-4" />;
      default: return <Palette className="h-4 w-4" />;
    }
  };

  const getVisualizationIcon = (mode: VisualizationMode) => {
    return mode === 'constellation' ? <Network className="h-4 w-4" /> : <GitGraph className="h-4 w-4" />;
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto space-y-6", className)}>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-semibold">Theme Customization</h2>
        <p className="text-muted-foreground">
          Personalize your Notara experience with themes, colors, and preferences
        </p>
      </div>

      <Tabs defaultValue="themes" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="themes" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
            Colors
          </TabsTrigger>
          <TabsTrigger value="visualization" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            View
          </TabsTrigger>
          {showAdvanced && (
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableThemes.map((theme) => (
              <Card 
                key={theme.mode} 
                className={cn(
                  "hover-lift cursor-pointer transition-all duration-200 relative",
                  settings.mode === theme.mode && "ring-2 ring-primary"
                )}
                onClick={() => setThemeMode(theme.mode)}
                onMouseEnter={() => setPreviewMode(theme.mode)}
                onMouseLeave={() => setPreviewMode(null)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getThemeIcon(theme.mode)}
                      <CardTitle className="text-lg">{theme.name}</CardTitle>
                    </div>
                    {settings.mode === theme.mode && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <CardDescription>{theme.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="h-20 rounded-lg border-2 border-border/50"
                    style={{ background: theme.preview }}
                  />
                  {previewMode === theme.mode && (
                    <Badge variant="secondary" className="mt-2 animate-fade-in">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-display font-semibold">Accent Colors</h3>
            <p className="text-sm text-muted-foreground">
              Choose your accent color to personalize buttons, links, and highlights
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {availableAccentColors.map((color) => (
              <Card 
                key={color.color}
                className={cn(
                  "hover-lift cursor-pointer transition-all duration-200",
                  settings.accentColor === color.color && "ring-2 ring-primary scale-105"
                )}
                onClick={() => setAccentColor(color.color)}
              >
                <CardContent className="p-4 text-center space-y-3">
                  <div 
                    className="w-12 h-12 rounded-full mx-auto shadow-lg"
                    style={{ backgroundColor: color.hexValue }}
                  />
                  <div>
                    <p className="font-medium text-sm">{color.name}</p>
                    <p className="text-xs text-muted-foreground">{color.hexValue}</p>
                  </div>
                  {settings.accentColor === color.color && (
                    <Check className="h-4 w-4 mx-auto text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="visualization" className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-display font-semibold">Visualization Mode</h3>
            <p className="text-sm text-muted-foreground">
              Choose how your notes are visualized in the connections view
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card 
              className={cn(
                "hover-lift cursor-pointer transition-all duration-200",
                settings.visualizationMode === 'constellation' && "ring-2 ring-primary"
              )}
              onClick={() => setVisualizationMode('constellation')}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getVisualizationIcon('constellation')}
                    <CardTitle>Constellation View</CardTitle>
                  </div>
                  {settings.visualizationMode === 'constellation' && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <CardDescription>
                  Playful, cosmic-inspired visualization with floating nodes and particle connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border flex items-center justify-center">
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i} 
                        className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" 
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={cn(
                "hover-lift cursor-pointer transition-all duration-200",
                settings.visualizationMode === 'graph' && "ring-2 ring-primary"
              )}
              onClick={() => setVisualizationMode('graph')}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getVisualizationIcon('graph')}
                    <CardTitle>Graph View</CardTitle>
                  </div>
                  {settings.visualizationMode === 'graph' && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <CardDescription>
                  Professional knowledge graph with clear nodes, edges, and hierarchical layouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-gradient-to-r from-gray-500/20 to-blue-500/20 rounded-lg border flex items-center justify-center">
                  <GitGraph className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {showAdvanced && (
          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-display font-semibold">Advanced Settings</h3>

              <div className="grid gap-6">
                {/* Animations Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Animations</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable smooth transitions and micro-interactions
                    </p>
                  </div>
                  <Switch 
                    checked={settings.animations}
                    onCheckedChange={setAnimations}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <Separator />

                {/* Font Size */}
                <div className="space-y-3">
                  <Label className="text-base">Font Size</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <Button
                        key={size}
                        variant={settings.fontSize === size ? 'default' : 'outline'}
                        onClick={() => setFontSize(size)}
                        className="capitalize"
                      >
                        <Type className="h-4 w-4 mr-2" />
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Import/Export */}
                <div className="space-y-4">
                  <Label className="text-base">Backup & Restore</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={handleExport}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Settings
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowImport(!showImport)}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import Settings
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetToDefaults}
                      className="flex-1"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>

                  {showImport && (
                    <div className="space-y-2 animate-slide-up">
                      <textarea
                        placeholder="Paste your theme settings JSON here..."
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                        className="w-full h-32 p-3 border rounded-md text-sm font-mono bg-muted"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleImport} disabled={!importData.trim()}>
                          Import
                        </Button>
                        <Button variant="outline" onClick={() => setShowImport(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Current Settings Preview */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Current Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Theme</p>
              <p className="font-semibold">
                {availableThemes.find(t => t.mode === settings.mode)?.name}
              </p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Accent</p>
              <p className="font-semibold">
                {availableAccentColors.find(c => c.color === settings.accentColor)?.name}
              </p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Visualization</p>
              <p className="font-semibold capitalize">{settings.visualizationMode}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Animations</p>
              <p className="font-semibold">{settings.animations ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThemeSelector;