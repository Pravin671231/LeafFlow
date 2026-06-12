import { useState, useEffect, useRef } from 'react';
import { setCredentials, clearCredentials } from '../../features/auth/authSlice';
import { authApi } from '../../api/authApi';
import { Loader } from '../ui/Loader';
import { useAppSelector, useAppDispatch } from '../../app/hooks';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [isInitializing, setIsInitializing] = useState(!accessToken);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current || accessToken) {
      setIsInitializing(false);
      return;
    }
    hasRun.current = true;

    async function init() {
      try {
        const refresh = await dispatch(
          authApi.endpoints.refresh.initiate(undefined),
        ).unwrap();

        const me = await dispatch(
          authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
        ).unwrap();

        dispatch(setCredentials({ admin: me, accessToken: refresh.accessToken }));
      } catch {
        dispatch(clearCredentials());
      } finally {
        setIsInitializing(false);
      }
    }

    void init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isInitializing) return <Loader />;
  return <>{children}</>;
}
