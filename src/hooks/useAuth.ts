import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Session } from '@supabase/supabase-js';

// Define your own user type with username
type AppUser = {
  id: string;
  email: string;
  username: string;
} | null;

export const useAuth = () => {
  const [user, setUser] = useState<AppUser>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const profileFetchRef = useRef<Set<string>>(new Set()); // Track in-flight profile fetches

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        // Set user immediately
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: '',
        });
        setLoading(false);
        // Fetch profile in background
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        // Set user immediately with auth data
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: '',
        });
        setLoading(false);
        // Fetch profile in background
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Timeout fallback (safety net)
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.log('⚠️ Auth timeout - forcing loading false');
        setLoading(false);
      }
    }, 15000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const fetchProfile = async (userId: string): Promise<void> => {
    // Skip if already fetching this user's profile
    if (profileFetchRef.current.has(userId)) {
      console.log('ℹ️ Profile fetch already in progress for user:', userId);
      return;
    }

    profileFetchRef.current.add(userId);

    try {
      console.log('📥 Fetching profile for user:', userId);
      
      // Use a short timeout - if Supabase is slow, just skip it
      const fetchPromise = supabase
        .from('profiles')
        .select('id, username, email')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000) // Reduced to 5s
      );

      const response = await Promise.race([
        fetchPromise,
        timeoutPromise as Promise<any>
      ]) as any;

      const { data, error } = response;

      if (error) {
        console.warn('⚠️ Profile query error (continuing anyway):', error.message);
        return; // Just return, don't throw
      }
      
      // Data will be null if profile doesn't exist
      if (!data) {
        console.log('ℹ️ Profile not found, using auth email only');
        return;
      }
      
      console.log('✅ Profile loaded:', data.username || data.email);
      // Update user with profile data
      setUser({
        id: userId,
        email: data.email || '',
        username: data.username || '',
      });
    } catch (error: any) {
      console.warn('⚠️ Profile fetch skipped:', error.message);
      // Silently continue - profile is optional
    } finally {
      profileFetchRef.current.delete(userId);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      console.log('📝 Attempting signup for:', email, 'username:', username);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username } // This will be saved to raw_user_meta_data and trigger will use it
        }
      });

      if (error) {
        console.error('❌ Signup auth error:', error.message);
        throw error;
      }
      
      console.log('✅ Signup successful, user ID:', data.user?.id);
      
      // Note: Profile will be created automatically by the database trigger
      // It should be available immediately but might take a moment
      
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('❌ Signup error:', error.message);
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Auth error:', error.message);
        setLoading(false);
        throw error;
      }
      
      console.log('✅ Auth successful, user ID:', data.user?.id);
      
      // Set user immediately with auth data (don't wait for profile)
      if (data.user?.id) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          username: '',
        });
        setLoading(false);
        
        // Fetch profile in background (non-blocking)
        fetchProfile(data.user.id);
      }
      
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('❌ Sign in error:', error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    logout
  };
};