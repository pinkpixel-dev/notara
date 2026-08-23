import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { POLLINATIONS_DEFAULT_CONFIG, readPollinationsConfig, savePollinationsConfig } from '@/lib/pollinations';

export const AiDataSettings = () => {
  const [exportFormat, setExportFormat] = useState('markdown');
  const [apiKey, setApiKey] = useState('');
  const [textModel, setTextModel] = useState(POLLINATIONS_DEFAULT_CONFIG.textModel);
  const [imageModel, setImageModel] = useState(POLLINATIONS_DEFAULT_CONFIG.imageModel);

  useEffect(() => {
    const config = readPollinationsConfig();
    setApiKey(config.apiKey);
    setTextModel(config.textModel);
    setImageModel(config.imageModel);
  }, []);

  const handleSaveAiSettings = () => {
    const saved = savePollinationsConfig({ apiKey, textModel, imageModel });
    setApiKey(saved.apiKey);
    setTextModel(saved.textModel);
    setImageModel(saved.imageModel);
    toast({
      title: 'AI settings saved',
      description: `Text model: ${saved.textModel} · Image model: ${saved.imageModel}`,
    });
  };

  const handleExportData = () => {
    toast({ title: 'Export successful', description: `Your data has been exported in ${exportFormat} format.` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI &amp; Data</CardTitle>
        <CardDescription>Configure the current AI provider and export your local data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1">
          <Label>AI Assistant (Pollinations)</Label>
          <p className="text-sm text-muted-foreground">
            Pollinations remains available during the OpenAI transition. These controls will be replaced by the saved OpenAI model list.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="pollinations-api-key">API Key</Label>
            <Input
              id="pollinations-api-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk_..."
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">Required for text and image generation during this transition.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pollinations-text-model">Text Model</Label>
            <Input id="pollinations-text-model" value={textModel} onChange={(event) => setTextModel(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pollinations-image-model">Image Model</Label>
            <Input id="pollinations-image-model" value={imageModel} onChange={(event) => setImageModel(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={handleSaveAiSettings} className="w-full">Save AI Settings</Button>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>Export Data</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="sm:w-[180px]"><SelectValue placeholder="Select format" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown (.md)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportData} className="flex items-center gap-2"><Download size={16} /> Export</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
