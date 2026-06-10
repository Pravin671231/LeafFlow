import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectAccessToken } from '../../features/auth/authSelectors';
import { setCredentials, clearCredentials } from '../../features/auth/authSlice';
import { authApi } from '../../api/authApi';
import { Loader } from '../ui/Loader';
import type { AppDispatch } from '../../app/store';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const accessToken = useSelector(selectAccessToken);
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
