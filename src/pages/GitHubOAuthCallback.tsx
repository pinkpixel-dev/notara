import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { parseCallbackParams, verifyState } from '@/lib/integrations/oauth/github';

/**
 * GitHub OAuth Callback Page
 * 
 * This page handles the OAuth redirect from GitHub after user authorization.
 * It extracts the authorization code and communicates back to the opener window.
 */
const GitHubOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing GitHub authorization...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse callback parameters
        const params = parseCallbackParams(window.location.href);

        // Check for OAuth errors
        if (params.error) {
          throw new Error(params.error_description || params.error);
        }

        // Verify required parameters
        if (!params.code || !params.state) {
          throw new Error('Missing authorization code or state parameter');
        }

        // Verify state to prevent CSRF attacks
        if (!verifyState(params.state)) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Send authorization code to opener window
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'github_oauth_success',
              code: params.code,
              state: params.state,
            },
            window.location.origin
          );

          setStatus('success');
          setMessage('Authorization successful! You can close this window.');

          // Auto-close after 2 seconds
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          throw new Error('Parent window not found - please try again');
        }
      } catch (error) {
        console.error('[OAuth Callback] Error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authorization failed');

        // Notify opener of error
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'github_oauth_error',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            window.location.origin
          );
        }

        // Redirect to settings after 3 seconds
        setTimeout(() => {
          if (window.opener && !window.opener.closed) {
            window.close();
          } else {
            navigate('/settings?tab=integrations');
          }
        }, 3000);
      }
    };

    void handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <div className="max-w-md w-full mx-4">
        <div className="glass-panel p-8 text-center space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">
            {status === 'loading' && (
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-16 w-16 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="h-16 w-16 text-destructive" />
            )}
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {status === 'loading' && 'Processing Authorization'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Authorization Failed'}
            </h1>
            <p className="text-muted-foreground">{message}</p>
          </div>

          {/* Additional Info */}
          {status === 'success' && (
            <p className="text-sm text-muted-foreground">
              This window will close automatically...
            </p>
          )}
          {status === 'error' && (
            <p className="text-sm text-muted-foreground">
              Redirecting to settings...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GitHubOAuthCallback;
