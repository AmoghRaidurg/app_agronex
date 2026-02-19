import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  signOut: async () => {},
  refreshUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string) => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/users/${uid}`);
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        await AsyncStorage.setItem('userData', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Try to get cached user data first
        const cachedData = await AsyncStorage.getItem('userData');
        if (cachedData) {
          setUserData(JSON.parse(cachedData));
        }
        
        // Fetch fresh user data
        await fetchUserData(firebaseUser.uid);
      } else {
        setUserData(null);
        await AsyncStorage.removeItem('userData');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserData(null);
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signOut, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};