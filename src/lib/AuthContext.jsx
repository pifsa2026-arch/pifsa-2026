import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';

const AuthContext = createContext({ user: null, role: 'none', loading: true });

// Works out what the signed-in person may do: 'admin' | 'staff' | 'examinee' | 'none'
async function resolveRole(user) {
  if (!user) return { role: 'none', examinee: null };
  const [admin, staff] = await Promise.all([supabase.rpc('is_admin'), supabase.rpc('is_staff')]);
  // Before roles_exams_chat.sql is run these functions don't exist yet; keep staff working as before
  if (staff.error && /could not find|does not exist|PGRST202/i.test(staff.error.message + staff.error.code)) {
    const { data } = await supabase.from('admins').select('email').eq('email', user.email).maybeSingle();
    return { role: data ? 'admin' : 'staff', examinee: null };
  }
  if (admin.data) return { role: 'admin', examinee: null };
  if (staff.data) return { role: 'staff', examinee: null };
  const { data } = await supabase.from('examinees').select('*').eq('id', user.id).maybeSingle();
  return data ? { role: 'examinee', examinee: data } : { role: 'none', examinee: null };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('none');
  const [examinee, setExaminee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let active = true;
    const apply = async (session) => {
      const u = session?.user ?? null;
      setLoading(true);
      const r = await resolveRole(u);
      if (!active) return;
      setUser(u); setRole(r.role); setExaminee(r.examinee); setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') apply(session);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const refreshExaminee = async () => {
    if (!user) return;
    const { data } = await supabase.from('examinees').select('*').eq('id', user.id).maybeSingle();
    setExaminee(data);
  };

  const signOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setUser(null); setRole('none'); setExaminee(null);
  };

  const isStaff = role === 'staff' || role === 'admin';
  return (
    <AuthContext.Provider value={{ user, role, isStaff, isAdmin: role === 'admin', examinee, loading, signOut, refreshExaminee }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
