'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useExamStore } from '@/stores/examStore';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

interface ConnectionContextType {
  isOnline: boolean;
  isConvexLive: boolean;
}

const ConnectionContext = createContext<ConnectionContextType>({
  isOnline: true,
  isConvexLive: Boolean(convexUrl),
});

export const useConnectionStatus = () => useContext(ConnectionContext);

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const setOffline = useExamStore((state) => state.setOffline);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  // Network connection state listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);

  const convexClient = useMemo(() => {
    if (convexUrl) {
      try {
        return new ConvexReactClient(convexUrl);
      } catch (err) {
        console.warn('Convex client initialization warning:', err);
        return null;
      }
    }
    return null;
  }, []);

  const contextValue = useMemo(
    () => ({
      isOnline,
      isConvexLive: Boolean(convexClient),
    }),
    [isOnline, convexClient]
  );

  return (
    <ConnectionContext.Provider value={contextValue}>
      {convexClient ? (
        <ConvexProvider client={convexClient}>{children}</ConvexProvider>
      ) : (
        children
      )}
    </ConnectionContext.Provider>
  );
}
