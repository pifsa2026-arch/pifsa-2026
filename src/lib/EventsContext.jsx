import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { TRAINING_DURATIONS } from './config.js';

const EventsContext = createContext(null);

// Fallback content (used if Supabase has no events yet, so the landing page never looks empty).
export const FALLBACK_DURATIONS = TRAINING_DURATIONS.map((d, i) => ({
  id: `fallback-dur-${i}`, kind: 'duration', title: d, date_range: d, featured: false, details: {}, sort_order: i,
}));

export const FALLBACK_FEATURED = {
  id: 'fallback-featured', kind: 'featured', featured: true, sort_order: 0,
  title: 'Professional Certificate in Forensic Accounting and Investigation',
  date_range: 'Aug 29 – Oct 17, 2026',
  details: {
    class: 'PCFAI Class 2026-01',
    description: '40 days (240 training hours) of hybrid learning — modular distance study, seven Saturday online sessions, and a 3-day face-to-face capstone with investigative interviewing, practice court, and graduation.',
    modality: 'Hybrid / Blended',
    saturdays: '8:30 AM – 5:00 PM',
    facetoface: 'Oct 15 – 17, 2026 · Manila',
    who: 'Graduates of Law, Accountancy, Business Administration, Financial Management, Criminology, and Forensic Science.',
    fee: '25,000', deposit: '5,000', balance: '20,000',
    deadline: '7:00 PM · Aug 28, 2026',
  },
};

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setEvents([]); setLoading(false); return; }
    const { data, error } = await supabase.from('events').select('*').order('sort_order', { ascending: true });
    if (error || !data) { setEvents([]); setConnected(false); }
    else { setEvents(data); setConnected(true); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEvent = useCallback(async (ev) => {
    if (!isSupabaseConfigured || !connected) return null;
    const { data, error } = await supabase.from('events').insert([ev]).select();
    if (error) { alert('Could not add event: ' + error.message); return null; }
    if (data) { setEvents((e) => [...e, data[0]]); return data[0]; }
  }, [connected]);

  const updateEvent = useCallback(async (id, patch) => {
    setEvents((e) => e.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (isSupabaseConfigured && connected) {
      const { error } = await supabase.from('events').update(patch).eq('id', id);
      if (error) alert('Could not save event: ' + error.message);
    }
  }, [connected]);

  const deleteEvent = useCallback(async (id) => {
    setEvents((e) => e.filter((x) => x.id !== id));
    if (isSupabaseConfigured && connected) await supabase.from('events').delete().eq('id', id);
  }, [connected]);

  // Derived: durations + featured, falling back to hardcoded if empty
  const durations = events.filter((e) => e.kind === 'duration');
  const featured = events.filter((e) => e.kind === 'featured');
  const displayDurations = durations.length ? durations : FALLBACK_DURATIONS;
  const displayFeatured = featured.length ? featured : [FALLBACK_FEATURED];

  return (
    <EventsContext.Provider value={{ events, loading, connected, addEvent, updateEvent, deleteEvent, reload: load, displayDurations, displayFeatured }}>
      {children}
    </EventsContext.Provider>
  );
}

export const useEvents = () => useContext(EventsContext);
