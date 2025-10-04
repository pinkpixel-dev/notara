import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  supabase, 
  signInWithGithub, 
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  signOut, 
  getCurrentUser 
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

  useEffect(() => {
    // Check active session
    const checkUser = async () => {
      try {
        // First try to get the session directly
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Found active session', session.user.email);
          setUser(session.user);
        } else {
          // Fallback to getCurrentUser
          try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
              console.log('Retrieved user from getCurrentUser', currentUser.email);
              setUser(currentUser);
            } else {
              console.log('No authenticated user found');
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

    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN') {
          toast({
            title: "Signed in successfully",
            description: `Welcome back${session?.user?.email ? `, ${session.user.email}` : ''}!`,
          });
        }
        
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
  }, []);

  const handleSignInWithGithub = async () => {
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
    isAuthenticated: !!user,
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
