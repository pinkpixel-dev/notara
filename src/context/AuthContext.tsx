import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import {
  supabase,
  signInWithGithub,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  signOut,
  getCurrentUser,
  isAuthEnabled,
} from '../lib/supabase';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGithub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const authAvailable = isAuthEnabled && !!supabase;

  const showAuthDisabledToast = (message: string) => {
    toast({
      title: 'Authentication disabled',
      description: message,
      variant: 'destructive',
    });
  };

  useEffect(() => {
    if (!authAvailable) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Check active session
    const checkUser = async () => {
      try {
        // First try to get the session directly
        const { data: { session } } = await supabase!.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
        } else {
          // Fallback to getCurrentUser
          try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
            }
          } catch (error) {
            console.error("Error in getCurrentUser:", error);
          }
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setLoading(false);
      }
    };

    void checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase!.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out",
            description: "You have been signed out successfully.",
          });
        }

        if (event === 'USER_UPDATED') {
          toast({
            title: "Profile updated",
            description: "Your profile has been updated successfully.",
          });
        }

        if (event === 'PASSWORD_RECOVERY') {
          toast({
            title: "Password reset",
            description: "Your password has been reset successfully.",
          });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [authAvailable]);

  const handleSignInWithGithub = async () => {
    if (!authAvailable) {
      showAuthDisabledToast('GitHub sign-in is currently unavailable.');
      return;
    }
    try {
      setLoading(true);
      await signInWithGithub();
    } catch (error) {
      console.error("Error signing in with GitHub:", error);
      toast({
        title: "Sign in failed",
        description: "There was a problem signing in with GitHub.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithEmail = async (email: string, password: string) => {
    if (!authAvailable) {
      showAuthDisabledToast('Email sign-in is currently unavailable.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await signInWithEmail(email, password);
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with email:", error);
      toast({
        title: "Sign in failed",
        description: "Invalid email or password.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpWithEmail = async (email: string, password: string) => {
    if (!authAvailable) {
      showAuthDisabledToast('Account creation is currently unavailable.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await signUpWithEmail(email, password);
      if (error) throw error;
      
      // The user will be automatically signed in now thanks to our changes in supabase.ts
      toast({
        title: "Account created",
        description: "Your account has been created and you are now signed in.",
      });
    } catch (error) {
      console.error("Error signing up with email:", error);
      toast({
        title: "Sign up failed",
        description: "There was a problem creating your account.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!authAvailable) {
      showAuthDisabledToast('Password reset is currently unavailable.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await resetPassword(email);
      if (error) throw error;
      toast({
        title: "Password reset email sent",
        description: "Check your email for the password reset link.",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Reset failed",
        description: "There was a problem sending the reset email.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!authAvailable) {
      showAuthDisabledToast('Sign out is currently unavailable.');
      return;
    }
    try {
      setLoading(true);
      await signOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign out failed",
        description: "There was a problem signing out.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGithub: handleSignInWithGithub,
    signInWithEmail: handleSignInWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    resetPassword: handleResetPassword,
    signOut: handleSignOut,
    isAuthenticated: authAvailable && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
