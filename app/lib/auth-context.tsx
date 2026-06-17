'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  uid:   string;
  email: string;
  name:  string;
  role:  'staff' | 'owner';
}

interface AuthContextValue {
  user:    AuthUser | null;
  loading: boolean;
  logout:  () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  loading: true,
  logout:  async () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged fires once immediately with the current auth state,
    // then on every future sign-in / sign-out.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          const data = snap.data() as User | undefined;
          setUser({
            uid:   firebaseUser.uid,
            email: firebaseUser.email ?? '',
            name:  data?.name ?? firebaseUser.email ?? 'Người dùng',
            role:  data?.role ?? 'staff',
          });
        } catch {
          // Firestore unreachable — default to staff so the UI isn't blocked
          setUser({
            uid:   firebaseUser.uid,
            email: firebaseUser.email ?? '',
            name:  firebaseUser.email ?? 'Người dùng',
            role:  'staff',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    // user is set to null automatically by onAuthStateChanged above
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = () => useContext(AuthContext);
