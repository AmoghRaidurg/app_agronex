import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { normalizeAppRole } from '../lib/roleUtils';

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
  provisioningFailed: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  retryProvisioning: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userData: null,
  loading: true,
  provisioningFailed: false,
  signOut: async () => {},
  refreshUserData: async () => {},
  retryProvisioning: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioningFailed, setProvisioningFailed] = useState(false);
  const provisioningRef = useRef<Promise<void> | null>(null);

  const refreshUserData = useCallback(async (uid?: string) => {
    const targetUid = uid || user?.id;
    if (!targetUid) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', targetUid)
      .single();

    if (!error && data) {
      const normalized = {
        ...(data as UserData),
        role: normalizeAppRole((data as UserData).role) as UserData['role'],
      };
      setUserData(normalized);
      setProvisioningFailed(false);
      await AsyncStorage.setItem('userData', JSON.stringify(normalized));
      return;
    }
    throw error ?? new Error('User profile not found');
  }, [user?.id]);

  const ensureUserRecords = useCallback(async (currentUser: User) => {
    if (provisioningRef.current) {
      return provisioningRef.current;
    }

    const task = (async () => {
      try {
        setProvisioningFailed(false);
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
            } catch {
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
        setProvisioningFailed(true);
      } finally {
        provisioningRef.current = null;
      }
    })();

    provisioningRef.current = task;
    return task;
  }, [refreshUserData]);

  const retryProvisioning = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setProvisioningFailed(false);
    await ensureUserRecords(user);
    setLoading(false);
  }, [user, ensureUserRecords]);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const cachedData = await AsyncStorage.getItem('userData');
        if (cachedData && mounted) {
          const parsed = JSON.parse(cachedData) as UserData;
          setUserData({
            ...parsed,
            role: normalizeAppRole(parsed.role) as UserData['role'],
          });
        }
      } catch {
        // ignore cache errors
      }

      const { data: { session: s } } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await ensureUserRecords(s.user);
      }
      setLoading(false);
    };

    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        if (event === 'INITIAL_SESSION') return;
        setLoading(true);
        await ensureUserRecords(s.user);
        setLoading(false);
      } else {
        setUserData(null);
        setProvisioningFailed(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureUserRecords]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setSession(null);
      setUser(null);
      setUserData(null);
      setProvisioningFailed(false);
      await AsyncStorage.removeItem('userData');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userData,
        loading,
        provisioningFailed,
        signOut,
        refreshUserData: () => refreshUserData(),
        retryProvisioning,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
