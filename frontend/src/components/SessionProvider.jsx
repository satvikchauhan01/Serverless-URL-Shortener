import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearToken, readToken, saveToken, SESSION_EXPIRED_EVENT } from '../api/client.js';
import { getMe } from '../api/endpoints.js';
import { SessionContext } from '../hooks/useSession.js';

export function SessionProvider({ children }) {
  const [state, setState] = useState(() => ({
    status: readToken() ? 'loading' : 'guest',
    user: null,
    expired: false,
  }));

  const loadUser = useCallback(
    () =>
      getMe().then(
        (user) => setState({ status: 'signed-in', user, expired: false }),
        // A rejected token is handled by the expiry event below; anything else (the API
        // being unreachable, say) leaves the token in place for the next page load.
        () =>
          setState((current) =>
            current.status === 'loading' ? { ...current, status: 'guest' } : current,
          ),
      ),
    [],
  );

  useEffect(() => {
    if (readToken()) loadUser();
  }, [loadUser]);

  useEffect(() => {
    const expire = () => {
      clearToken();
      setState({ status: 'guest', user: null, expired: true });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      signIn(token) {
        saveToken(token);
        setState({ status: 'loading', user: null, expired: false });
        return loadUser();
      },
      signOut() {
        clearToken();
        setState({ status: 'guest', user: null, expired: false });
      },
      // Link and click totals change as the user works; the dashboard asks for fresh ones.
      refresh: loadUser,
    }),
    [state, loadUser],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
