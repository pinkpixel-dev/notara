import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkSupabaseCredentials, supabase } from '@/lib/supabase';

export const AuthDebug: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [envInfo, setEnvInfo] = useState({
    supabaseUrl: '',
    hasAnonKey: false,
    anonKeyLength: 0,
    githubClientId: !!import.meta.env.VITE_GITHUB_CLIENT_ID,
    appUrl: import.meta.env.VITE_APP_URL || window.location.origin
  });
  
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    // Check Supabase credentials
    const credentials = checkSupabaseCredentials();
    setEnvInfo(prev => ({
      ...prev,
      supabaseUrl: credentials.supabaseUrl || 'Not found',
      hasAnonKey: credentials.hasAnonKey,
      anonKeyLength: credentials.anonKeyLength
    }));

    // Test Supabase connection
    const testConnection = async () => {
      try {
        // Simple connection test
        const { error } = await supabase.from('_test_connection').select('*').limit(1).maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          // PGRST116 is expected since we're trying to access a non-existent table
          // Any other error indicates a real connection issue
          setSupabaseStatus('error');
          setErrorDetails(error.message);
        } else {
          setSupabaseStatus('ok');
        }
      } catch (err) {
        setSupabaseStatus('error');
        setErrorDetails(err instanceof Error ? err.message : String(err));
      }
    };

    testConnection();
  }, []);

  return (
    <Card className="w-full max-w-3xl mx-auto mt-8 border-cosmos-stardust bg-cosmos-deepspace/90 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Authentication Diagnostic Tool</span>
          <Badge variant={supabaseStatus === 'ok' ? 'default' : 'destructive'}>
            {supabaseStatus === 'checking' ? 'Checking...' : 
             supabaseStatus === 'ok' ? 'Connection OK' : 'Connection Error'}
          </Badge>
        </CardTitle>
        <CardDescription className="text-cosmos-nebula">
          Use this tool to diagnose authentication issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium">Supabase Configuration</h3>
            <div className="space-y-1 text-sm">
              <p>URL: {envInfo.supabaseUrl.substring(0, 8)}...{envInfo.supabaseUrl.length > 10 ? envInfo.supabaseUrl.substring(envInfo.supabaseUrl.length - 8) : ''}</p>
              <p>API Key: {envInfo.hasAnonKey ? `Present (${envInfo.anonKeyLength} chars)` : 'Missing'}</p>
              <p>Connection: {supabaseStatus === 'checking' ? 'Testing...' : 
                            supabaseStatus === 'ok' ? 'Success' : 'Failed'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">GitHub OAuth</h3>
            <div className="space-y-1 text-sm">
              <p>Client ID: {envInfo.githubClientId ? 'Present' : 'Missing'}</p>
              <p>Callback URL: {envInfo.appUrl}/auth/callback</p>
              <p><strong>Important:</strong> Make sure this callback URL is set in GitHub OAuth settings</p>
            </div>
          </div>
        </div>

        {errorDetails && (
          <div className="bg-red-900/30 border border-red-500 p-3 rounded-md text-sm">
            <h3 className="font-medium mb-1">Error Details:</h3>
            <pre className="whitespace-pre-wrap text-xs">{errorDetails}</pre>
          </div>
        )}

        <div className="bg-yellow-900/30 border border-yellow-500 p-3 rounded-md text-sm">
          <h3 className="font-medium mb-1">Common Issues:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Invalid API key format or expired API key</li>
            <li>Incorrect OAuth redirect URL in GitHub settings</li>
            <li>GitHub OAuth app not verified</li>
            <li>CORS policy issues in Supabase settings</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </CardFooter>
    </Card>
  );
};

export default AuthDebug; 