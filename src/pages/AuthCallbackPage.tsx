import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AlertCircleIcon } from 'lucide-react';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash and log for debugging
        const hash = window.location.hash;
        if (hash) {
          console.log('Auth callback hash:', hash);
        }

        // Get the URL parameters
        const url = new URL(window.location.href);
        const errorParam = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        
        if (errorParam) {
          console.error(`Auth error: ${errorParam} - ${errorDescription}`);
          setError(`${errorParam}: ${errorDescription}`);
          return;
        }

        // Get the auth callback code
        const code = url.searchParams.get('code');
        if (!code) {
          console.log('No auth code found in URL');
        }

        // Exchange the code for a session (Supabase will handle this automatically)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error processing auth callback:', error);
          setError(error.message);
          return;
        }

        console.log('Auth callback successful', !!data.session);
        
        // Navigate back to home after a successful authentication
        const timer = setTimeout(() => {
          navigate('/');
        }, 2000);
        
        return () => clearTimeout(timer);
      } catch (err) {
        console.error('Unexpected error during auth callback:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  // If user is already authenticated or becomes authenticated during callback,
  // set a timer to redirect them home
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-cosmos-deepspace">
      <div className="w-24 h-24 mb-8 rounded-full bg-gradient-to-br from-cosmos-stardust to-cosmos-aurora animate-pulse flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-cosmos-deepspace animate-ping"></div>
      </div>
      
      {error ? (
        <>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircleIcon className="text-red-500" />
            <h1 className="text-3xl font-bold text-white">Authentication Error</h1>
          </div>
          <p className="text-red-300 mb-8 text-center max-w-md px-4">
            {error}
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-4 text-white">Logging you in...</h1>
          <p className="text-muted-foreground mb-8 text-center max-w-md px-4">
            You will be redirected back to Notara momentarily.
            <br />
            If you are not redirected, click the button below.
          </p>
        </>
      )}
      
      <Button onClick={() => navigate('/')}>
        Return to Notara
      </Button>
    </div>
  );
};

export default AuthCallbackPage;
