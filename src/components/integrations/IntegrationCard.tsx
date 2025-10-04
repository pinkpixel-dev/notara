import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Check, AlertCircle, Loader2, RefreshCw, Settings2 } from 'lucide-react';
import type { IntegrationProvider, IntegrationState } from '@/lib/integrations/types';
import { formatDistanceToNow } from 'date-fns';

interface IntegrationCardProps {
  provider: IntegrationProvider;
  state: IntegrationState | null;
  icon: React.ReactNode;
  title: string;
  description: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onConfigure?: () => void;
  onManualSync?: () => void;
}

const getStatusBadge = (status: IntegrationState['status']) => {
  switch (status) {
    case 'connected':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <Check className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      );
    case 'connecting':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Connecting
        </Badge>
      );
    case 'syncing':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Syncing
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    case 'rate-limited':
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Rate Limited
        </Badge>
      );
    case 'disconnected':
    default:
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          Disconnected
        </Badge>
      );
  }
};

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  provider,
  state,
  icon,
  title,
  description,
  onConnect,
  onDisconnect,
  onConfigure,
  onManualSync,
}) => {
  const isConnected = state?.status === 'connected' || state?.status === 'syncing';
  const isLoading = state?.status === 'connecting' || state?.status === 'syncing';
  const hasError = state?.status === 'error' || state?.status === 'rate-limited';
  const requiresRepo = provider === 'github';
  const repoConfigured = Boolean(state?.config?.repoOwner && state?.config?.repoName);
  const disableManualActions =
    isLoading || (requiresRepo && isConnected && !repoConfigured);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5 text-muted-foreground flex-shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{title}</h3>
              {state && getStatusBadge(state.status)}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>

            {/* Connection Details */}
            {isConnected && state && (
              <div className="mt-2 space-y-1">
                {state.config?.userName && (
                  <p className="text-xs text-muted-foreground">
                    Connected as <span className="font-medium text-foreground">{state.config.userName}</span>
                  </p>
                )}
                {state.config?.repoOwner && state.config?.repoName && (
                  <p className="text-xs text-muted-foreground">
                    Repository <span className="font-medium text-foreground">{state.config.repoOwner}/{state.config.repoName}</span>
                    {state.config.branch ? ` (${state.config.branch})` : ''}
                  </p>
                )}
                {requiresRepo && (!state.config?.repoOwner || !state.config?.repoName) && (
                  <p className="text-xs text-amber-600">
                    Repository not configured. Save a repository below to enable syncing.
                  </p>
                )}
                {state.lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    Last synced {formatDistanceToNow(new Date(state.lastSyncAt), { addSuffix: true })}
                  </p>
                )}
                {state.metrics && state.metrics.notesCount !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {state.metrics.notesCount} notes synced
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {hasError && state?.lastError && (
              <div className="mt-2 p-2 rounded-md bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-600 font-medium">{state.lastError.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isConnected && state?.isEnabled && (
            <Button
              onClick={onConnect}
              disabled={isLoading || !state?.isEnabled}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {state?.isEnabled ? 'Connect' : 'Coming Soon'}
            </Button>
          )}

          {isConnected && (
            <>
              {onManualSync && (
                <Button
                  onClick={onManualSync}
                  disabled={disableManualActions}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
              {onConfigure && (
                <Button
                  onClick={onConfigure}
                  disabled={disableManualActions}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={onDisconnect}
                disabled={isLoading}
                variant="outline"
                className="text-red-600 hover:bg-red-500/10"
              >
                Disconnect
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Show feature disabled message */}
      {!state?.isEnabled && (
        <p className="text-xs text-muted-foreground italic pl-8">
          Enable in your .env file: VITE_ENABLE_{provider.toUpperCase().replace('-', '_')}_INTEGRATION=true
        </p>
      )}
    </div>
  );
};
