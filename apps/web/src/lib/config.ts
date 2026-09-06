// Dynamic API Base URL resolver
export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // If in browser on production (e.g. Vercel) without env var, use relative path (proxied by Next.js rewrites)
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return '';
  }
  return 'http://localhost:4005';
};

export const apiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();
  return `${base}${cleanEndpoint}`;
};
