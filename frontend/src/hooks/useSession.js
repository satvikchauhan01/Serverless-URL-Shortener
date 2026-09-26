import { createContext, useContext } from 'react';

// Filled in by <SessionProvider>. `status` is 'loading' while a stored token is being
// checked, then 'signed-in' or 'guest'.
export const SessionContext = createContext(null);

export function useSession() {
  return useContext(SessionContext);
}
