import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { upsertUser } from '../lib/db.js';

const STORAGE_KEY = 'proofreview:user:v1';

const AuthContext = createContext({
  user: null,
  isVerified: false,
  signIn: async () => {},
  signOut: () => {},
});

function loadUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUser(user) {
  if (typeof window === 'undefined') return;
  if (!user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadUser());

  const signIn = useCallback(async ({ nullifier_hash }) => {
    const next = {
      nullifier_hash,
      verified: true,
      verifiedAt: Date.now(),
    };
    setUser(next);
    saveUser(next);
    try {
      await upsertUser({ nullifier_hash });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[ProofReview] Failed to upsert user:', err);
    }
    return next;
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    saveUser(null);
  }, []);

  useEffect(() => {
    // Cross-tab sync.
    function onStorage(e) {
      if (e.key !== STORAGE_KEY) return;
      setUser(e.newValue ? JSON.parse(e.newValue) : null);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isVerified: Boolean(user?.verified),
      signIn,
      signOut,
    }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
