import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RouterContextType {
  currentPath: string;
  fullPath: string;
  searchParams: URLSearchParams;
  highlightId: string | null;
  searchParamQuery: string;
  navigate: (path: string) => void;
  clearHighlight: () => void;
  factoryDetailId: string | null;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fullPath, setFullPath] = useState<string>(() => {
    return (window.location.pathname || '/') + (window.location.search || '');
  });

  useEffect(() => {
    const handlePopState = () => {
      setFullPath((window.location.pathname || '/') + (window.location.search || ''));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    const target = path.startsWith('/') ? path : `/${path}`;
    const current = (window.location.pathname || '/') + (window.location.search || '');
    if (current !== target) {
      window.history.pushState({}, '', target);
    }
    setFullPath(target);
  }, []);

  const [pathOnly, queryString = ''] = fullPath.split('?');
  const currentPath = pathOnly || '/';
  const searchParams = new URLSearchParams(queryString ? `?${queryString}` : '');
  const highlightId = searchParams.get('highlight') || searchParams.get('id') || null;
  const searchParamQuery = searchParams.get('q') || searchParams.get('search') || '';

  const clearHighlight = useCallback(() => {
    if (searchParams.has('highlight') || searchParams.has('id')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('highlight');
      nextParams.delete('id');
      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${currentPath}?${nextQuery}` : currentPath;
      window.history.replaceState({}, '', nextUrl);
      setFullPath(nextUrl);
    }
  }, [currentPath, searchParams]);

  // Detect if current path is a factory detail: /super-admin/factories/FAC-xxx
  let factoryDetailId: string | null = null;
  const match = currentPath.match(/^\/super-admin\/factories\/(FAC-[0-9]+)/);
  if (match) {
    factoryDetailId = match[1];
  }

  return (
    <RouterContext.Provider
      value={{
        currentPath,
        fullPath,
        searchParams,
        highlightId,
        searchParamQuery,
        navigate,
        clearHighlight,
        factoryDetailId
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
