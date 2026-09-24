// Dynamic API Base URL resolver
export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    if (url) return url;
  }

  // If in browser, relative paths are proxied via Next.js rewrites to live API
  if (typeof window !== 'undefined') {
    return '';
  }

  return 'https://shohojhisab.onrender.com';
};

export const apiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();
  return `${base}${cleanEndpoint}`;
};
