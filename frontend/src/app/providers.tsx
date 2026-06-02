'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { SiteSettingsApplier } from '@/components/SiteSettingsApplier';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000 } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <SiteSettingsApplier />
      {children}
    </QueryClientProvider>
  );
}
