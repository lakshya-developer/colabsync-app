'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export interface CompanyData {
  _id: string;
  name: string;
  domain?: string;
  avatarUrl?: string;
  slug: string;
  designations: string[];
  settings: {
    timezone: string;
    workingHours: { start: string; end: string };
    task: {
      defaultPriority: string;
      allowTaskDelete: boolean;
    };
    chat: {
      allowFileSharing: boolean;
      archivePeriodDays: number;
    };
    policies: {
      passwordExpiryDays: number;
      allowExternalUsers: boolean;
    };
  };
}

interface CompanyContextValue {
  company: CompanyData | null;
  isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextValue>({
  company: null,
  isLoading: true,
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.companyId) {
      setIsLoading(false);
      return;
    }

    fetch('/api/company/me')
      .then((r) => r.json())
      .then((data) => {
        setCompany(data.company ?? null);
      })
      .catch(() => setCompany(null))
      .finally(() => setIsLoading(false));
  }, [session, status]);

  return (
    <CompanyContext.Provider value={{ company, isLoading }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
