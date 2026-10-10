import { createContext, useContext, useState } from 'react';

// The parent's details from step 1, kept until they confirm a slot in step 2.
// Saved in sessionStorage so a page refresh does not lose them.
const KEY = 'codeyoung.bookingDraft';
const DraftContext = createContext(null);

function load() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch { return null; }
}

export function BookingDraftProvider({ children }) {
  const [draft, setDraftState] = useState(load);
  const setDraft = (value) => {
    setDraftState(value);
    try { value ? sessionStorage.setItem(KEY, JSON.stringify(value)) : sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  };
  return <DraftContext.Provider value={{ draft, setDraft }}>{children}</DraftContext.Provider>;
}

export const useDraft = () => useContext(DraftContext);
