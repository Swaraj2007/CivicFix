import { useState, useEffect, useCallback } from 'react';

export type Route =
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'admin-login' }
  | { name: 'citizen-home' }
  | { name: 'citizen-report' }
  | { name: 'citizen-track' }
  | { name: 'citizen-track-detail'; id: string }
  | { name: 'citizen-result'; id: string }
  | { name: 'citizen-ai-analysis'; id: string }
  | { name: 'admin-dashboard' }
  | { name: 'admin-map' }
  | { name: 'admin-table' }
  | { name: 'admin-detail'; id: string }
  | { name: 'admin-duplicates' }
  | { name: 'admin-duplicate-detail'; id: string }
  | { name: 'admin-sla' };

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'citizen-home' };

  switch (parts[0]) {
    case 'login': return { name: 'login' };
    case 'signup': return { name: 'signup' };
    case 'admin-login': return { name: 'admin-login' };
    case 'citizen':
      if (parts[1] === 'report') return { name: 'citizen-report' };
      if (parts[1] === 'track' && parts[2]) return { name: 'citizen-track-detail', id: parts[2] };
      if (parts[1] === 'track') return { name: 'citizen-track' };
      if (parts[1] === 'result' && parts[2]) return { name: 'citizen-result', id: parts[2] };
      if (parts[1] === 'analysis' && parts[2]) return { name: 'citizen-ai-analysis', id: parts[2] };
      return { name: 'citizen-home' };
    case 'admin':
      if (parts[1] === 'map') return { name: 'admin-map' };
      if (parts[1] === 'table') return { name: 'admin-table' };
      if (parts[1] === 'complaint' && parts[2]) return { name: 'admin-detail', id: parts[2] };
      if (parts[1] === 'duplicates' && parts[2]) return { name: 'admin-duplicate-detail', id: parts[2] };
      if (parts[1] === 'duplicates') return { name: 'admin-duplicates' };
      if (parts[1] === 'sla') return { name: 'admin-sla' };
      return { name: 'admin-dashboard' };
    default:
      return { name: 'citizen-home' };
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'login': return '#/login';
    case 'signup': return '#/signup';
    case 'admin-login': return '#/admin-login';
    case 'citizen-home': return '#/';
    case 'citizen-report': return '#/citizen/report';
    case 'citizen-track': return '#/citizen/track';
    case 'citizen-track-detail': return `#/citizen/track/${route.id}`;
    case 'citizen-result': return `#/citizen/result/${route.id}`;
    case 'citizen-ai-analysis': return `#/citizen/analysis/${route.id}`;
    case 'admin-dashboard': return '#/admin';
    case 'admin-map': return '#/admin/map';
    case 'admin-table': return '#/admin/table';
    case 'admin-detail': return `#/admin/complaint/${route.id}`;
    case 'admin-duplicates': return '#/admin/duplicates';
    case 'admin-duplicate-detail': return `#/admin/duplicates/${route.id}`;
    case 'admin-sla': return '#/admin/sla';
  }
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const handler = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((r: Route) => {
    window.location.hash = routeToHash(r);
  }, []);

  return { route, navigate };
}
