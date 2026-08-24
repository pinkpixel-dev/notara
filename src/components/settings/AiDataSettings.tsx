import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { OpenAiSettings } from './OpenAiSettings';

export const AiDataSettings = () => {
  const [exportFormat, setExportFormat] = useState('markdown');

  const handleExportData = () => {
    toast({ title: 'Export successful', description: `Your data has been exported in ${exportFormat} format.` });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI provider</CardTitle>
          <CardDescription>Connect OpenAI and choose the models Notara uses.</CardDescription>
        </CardHeader>
        <CardContent>
          <OpenAiSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Export your local data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="export-format">Export Data</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger id="export-format" className="sm:w-[180px]">
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
              <Download size={16} /> Export
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
