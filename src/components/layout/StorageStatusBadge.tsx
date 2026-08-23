import React, { useCallback, useState } from 'react';
import { HardDrive, ShieldAlert, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFileSystem } from '@/context/FileSystemContext';
import { toast } from '@/hooks/use-toast';

const StorageStatusBadge: React.FC = () => {
  const { status, rootHandle, selectDirectory, reconnectToPersisted, lastError } = useFileSystem();
  const isAppStorage = rootHandle?.kind === 'tauri' && rootHandle.source === 'app-data';
  const storageLabel = isAppStorage ? 'App storage' : rootHandle?.name || 'Notara';
  // App storage is the fallback, not a chosen workspace, so the tooltip says
  // which one is in use and where the files actually are.
  const storageDetail = isAppStorage
    ? 'Saving to Notara app storage. Choose a workspace folder to keep notes somewhere you control.'
    : rootHandle?.kind === 'tauri'
      ? `Saving to ${rootHandle.path}`
      : `Saving to the ${rootHandle?.name ?? 'selected'} folder.`;

  // Picking a folder waits on the OS dialog, so the control has to show that
  // something is happening and refuse a second press meanwhile.
  const [isBusy, setIsBusy] = useState(false);

  const handleSelect = useCallback(async () => {
    setIsBusy(true);
    try {
      const connected = await selectDirectory();
      if (connected) {
        toast({
          title: 'Workspace ready',
          description: 'Notara is reading and writing in your chosen folder.',
        });
      }
    } finally {
      setIsBusy(false);
    }
  }, [selectDirectory]);

  const handleReconnect = useCallback(async () => {
    setIsBusy(true);
    try {
      const connected = await reconnectToPersisted();
      if (connected) {
        toast({
          title: 'Storage reconnected',
          description: 'Folder permissions restored.',
        });
      }
    } finally {
      setIsBusy(false);
    }
  }, [reconnectToPersisted]);

  if (status === 'unsupported') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">File access unavailable</span>
        <span className="sr-only sm:hidden">File access unavailable</span>
      </span>
    );
  }

  if (status === 'ready') {
    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label={`Storage: ${storageLabel}`}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors"
        >
          <HardDrive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden max-w-[10rem] truncate sm:inline">{storageLabel}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs break-words">{storageDetail}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (status === 'needs-permission') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleReconnect}
        loading={isBusy}
        loadingLabel="Re-authorizing folder access"
        className="flex shrink-0 items-center gap-2"
        aria-label="Re-authorize folder access"
      >
        {!isBusy && <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span className="hidden whitespace-nowrap sm:inline">Re-authorize</span>
      </Button>
    );
  }

  if (status === 'error') {
    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label="Storage error"
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-destructive/60 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"
        >
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Storage error</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{lastError || 'Unable to access the Notara folder.'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSelect}
      loading={isBusy}
      loadingLabel="Opening folder picker"
      className="flex shrink-0 items-center gap-2"
      aria-label="Choose workspace folder"
    >
      {!isBusy && <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span className="hidden whitespace-nowrap sm:inline">Choose folder</span>
    </Button>
  );
};

export default StorageStatusBadge;
