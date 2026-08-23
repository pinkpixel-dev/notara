import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const QuickReference: React.FC = () => (
  <div className="h-full overflow-y-auto surface-content border-l border-border px-5 py-6 space-y-6">
    <Card className="surface-elevated">
      <CardHeader>
        <CardTitle className="text-lg">Quick Reference</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">**bold**</span>
          <p>Wrap text with double asterisks for emphasis.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">*italic*</span>
          <p>Single asterisks or underscores make text italic.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">`code`</span>
          <p>Use backticks for inline code snippets or commands.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">{'>'} quote</span>
          <p>Add inspirational callouts or references with blockquotes.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">[text](url)</span>
          <p>Link to resources right from your notes.</p>
        </div>
      </CardContent>
    </Card>

    <Card className="surface-elevated">
      <CardHeader>
        <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Toggle preview</span>
          <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded-md">Ctrl/Cmd + P</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Bold selection</span>
          <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded-md">Ctrl/Cmd + B</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Italic selection</span>
          <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded-md">Ctrl/Cmd + I</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Insert link</span>
          <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded-md">Ctrl/Cmd + K</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Create checkbox</span>
          <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded-md">- [ ]</span>
        </div>
      </CardContent>
    </Card>

    <Card className="surface-elevated">
      <CardHeader>
        <CardTitle className="text-lg">Templates & Tips</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div>
          <h3 className="text-foreground font-medium mb-2">Starter Templates</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">## Meeting Notes</span>
              <p>Track attendees, agenda, and action items with headings and task lists.</p>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">### Daily Log</span>
              <p>Use headings for each day and bullet lists to capture quick updates.</p>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">#### Idea Vault</span>
              <p>Combine quotes, images, and code blocks to store inspiration.</p>
            </li>
          </ul>
        </div>

        <Separator className="bg-border/40" />

        <div>
          <h3 className="text-foreground font-medium mb-2">Export Tips</h3>
          <p className="mb-2">Use fenced code blocks (<span className="font-mono text-xs">```language</span>) for syntax highlighting and clean exports.</p>
          <p className="mb-2">Notebook PDFs look best with headings structured from <span className="font-mono text-xs">#</span> down to <span className="font-mono text-xs">###</span>.</p>
          <p>Embed links to Constellation and Vision Boards so generated summaries stay contextual.</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default QuickReference;
