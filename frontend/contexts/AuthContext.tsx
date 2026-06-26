import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface UserData {
  uid: string;
  phoneNumber: string;
  role: 'farmer' | 'trader' | 'customer' | 'industrialist' | 'admin';
  name: string;
  address: string;
  bankUPI: string;
  walletBalance: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userData: null,
  loading: true,
  signOut: async () => {},
  refreshUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Mirrors ensureUserRecords from the website
  const ensureUserRecords = async (currentUser: User) => {
    try {
      const meta = currentUser.user_metadata ?? {};
      const role = (meta.role as string) || 'farmer';
      const name = (meta.name as string) || currentUser.email?.split('@')[0] || 'User';

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: currentUser.id,
          email: currentUser.email,
          name,
          role,
          address: meta.address ?? '',
          phone: meta.phone ?? '',
          bank_account: meta.bank_account ?? '',
          approved: true,
          suspended: false,
        });
        if (profileError) {
          try {
            await supabase.rpc('ensure_profile_from_auth');
          } catch (e) {
            // Ignore RPC failure if migration isn't applied yet
          }
        }
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('uid')
        .eq('uid', currentUser.id)
        .maybeSingle();

      if (!existingUser) {
        const { error: rpcError } = await supabase.rpc('ensure_profile_from_auth');
        if (rpcError) {
          console.error('Failed to provision users wallet row via RPC:', rpcError.message);
        }
      }

      await refreshUserData(currentUser.id);
    } catch (error) {
      console.error('Error ensuring user records:', error);
    }
  };

  const refreshUserData = async (uid?: string) => {
    const targetUid = uid || user?.id;
    if (!targetUid) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', targetUid)
        .single();

      if (!error && data) {
        setUserData(data as UserData);
        await AsyncStorage.setItem('userData', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      // Try to load cached userData immediately for fast UI
      try {
        const cachedData = await AsyncStorage.getItem('userData');
        if (cachedData) {
          setUserData(JSON.parse(cachedData));
        }
      } catch (e) {
        // ignore cache errors
      }

      supabase.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          ensureUserRecords(s.user).then(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        ensureUserRecords(s.user).finally(() => setLoading(false));
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      setSession(null);
      setUser(null);
      setUserData(null);
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, userData, loading, signOut, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};