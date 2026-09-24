'use client';
import { useEffect } from 'react';

// Keeps live Render server awake by pinging /health periodically
export function useRenderKeepAlive() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const pingServer = async () => {
      try {
        const liveApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://shohojhisab.onrender.com';
        await fetch(`${liveApiUrl}/health`, {
          method: 'GET',
          cache: 'no-store',
          mode: 'no-cors'
        });
      } catch (e) {
        // Silently catch network drops
      }
    };

    // Ping once on mount
    pingServer();

    // Ping every 7 minutes (Render sleeps after 15 minutes of inactivity)
    const interval = setInterval(pingServer, 7 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}
