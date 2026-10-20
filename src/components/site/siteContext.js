import { createContext, useContext } from 'react';

// Shared by every public page: jump to the application form, or pre-pick a program first
export const SiteContext = createContext({ goApply: () => {}, enrollIn: () => {}, picked: null });
export const useSite = () => useContext(SiteContext);
