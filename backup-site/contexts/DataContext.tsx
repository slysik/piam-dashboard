'use client';

import { createContext, useContext, ReactNode } from 'react';

interface DataContextType {
  useLiveData: boolean;
  clickhouseUrl: string;
  tenant: string;
}

const DataContext = createContext<DataContextType>({
  useLiveData: false,
  clickhouseUrl: 'http://localhost:8123',
  tenant: 'acme',
});

export function DataProvider({
  children,
  useLiveData,
  clickhouseUrl,
  tenant,
}: {
  children: ReactNode;
  useLiveData: boolean;
  clickhouseUrl: string;
  tenant: string;
}) {
  return (
    <DataContext.Provider value={{ useLiveData, clickhouseUrl, tenant }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  return useContext(DataContext);
}

export default DataContext;
