import React, { useCallback } from 'react';
import { HardDrive, ShieldAlert, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFileSystem } from '@/context/FileSystemContext';
import { toast } from '@/hooks/use-toast';

const StorageStatusBadge: React.FC = () => {
  const { status, rootHandle, selectDirectory, reconnectToPersisted, lastError } = useFileSystem();
  const storageLabel =
    rootHandle?.kind === 'tauri' && rootHandle.source === 'app-data'
      ? 'App storage'
      : rootHandle?.name || 'Notara';

  const handleSelect = useCallback(async () => {
    const connected = await selectDirectory();
    if (connected) {
      toast({
        title: 'Storage ready',
        description: 'Notara storage is ready to use.',
      });
    }
  }, [selectDirectory]);

  const handleReconnect = useCallback(async () => {
    const connected = await reconnectToPersisted();
    if (connected) {
      toast({
        title: 'Storage reconnected',
        description: 'Folder permissions restored.',
      });
    }
  }, [reconnectToPersisted]);

  if (status === 'unsupported') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/50 px-2 py-1 text-xs font-medium text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" />
        File access unavailable
      </span>
    );
  }

  if (status === 'ready') {
    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-xs font-medium text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <HardDrive className="h-3.5 w-3.5" />
          <span className="max-w-[10rem] truncate">{storageLabel}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Saving to Notara app storage.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (status === 'needs-permission') {
    return (
      <Button variant="outline" size="sm" onClick={handleReconnect} className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" />
        Re-authorize
      </Button>
    );
  }

  if (status === 'error') {
    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-destructive/60 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Storage error
        </TooltipTrigger>
        <TooltipContent>
          <p>{lastError || 'Unable to access the Notara folder.'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSelect} className="flex items-center gap-2">
      <FolderOpen className="h-4 w-4" />
      Choose folder
    </Button>
  );
};

export default StorageStatusBadge;
