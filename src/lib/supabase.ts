import { createClient } from '@supabase/supabase-js';

// Get environment variables for Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add debug logging to check for missing environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', { 
    urlExists: !!supabaseUrl, 
    keyExists: !!supabaseAnonKey 
  });
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Authentication functions
export const signInWithGithub = async () => {
  try {
    return await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'user:email'
      }
    });
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  } catch (error) {
    console.error('Email sign in error:', error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    // For development: Auto-confirm email signups by setting emailRedirectTo to null
    // and adding data.user in the success case
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // In development, disable email confirmation
        emailRedirectTo: null,
        // Set this to true for auto-confirmation (bypasses email verification)
        // Remove or set to false in production
        data: {
          email_confirmed: true
        }
      }
    });

    // If successful registration and auto-confirm enabled, sign in the user immediately
    if (data.user && !error) {
      console.log('Auto-confirming user and signing in');
      await signInWithEmail(email, password);
    }

    return { data, error };
  } catch (error) {
    console.error('Email sign up error:', error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    return data?.user;
  } catch (error) {
    console.error('Unexpected error in getCurrentUser:', error);
    return null;
  }
};

// Export function to check Supabase credentials
export const checkSupabaseCredentials = () => {
  return {
    supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    anonKeyLength: supabaseAnonKey?.length || 0
  };
};

// Add these functions when you have actual Supabase credentials
export const initSupabase = (url: string, key: string) => {
  return createClient(url, key);
};
