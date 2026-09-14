import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { useAuth } from './AuthContext.jsx';

// Checks whether the logged-in user's email is in the public.admins allowlist.
// In preview/dev (no Supabase), returns true so the console is viewable.
export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!isSupabaseConfigured) { setIsAdmin(true); setChecked(true); return; } // preview mode
      if (!user?.email) { setIsAdmin(false); setChecked(true); return; }
      const { data } = await supabase.from('admins').select('email').eq('email', user.email).maybeSingle();
      if (active) { setIsAdmin(Boolean(data)); setChecked(true); }
    };
    check();
    return () => { active = false; };
  }, [user]);

  return { isAdmin, checked };
}
