import { isSupabaseConfigured } from './supabase.js';
import { useAuth } from './AuthContext.jsx';

// Admins are listed in the public.admins table. In preview/dev (no Supabase) everyone is treated as admin.
export function useIsAdmin() {
  const { isAdmin, loading } = useAuth();
  if (!isSupabaseConfigured) return { isAdmin: true, checked: true };
  return { isAdmin, checked: !loading };
}
