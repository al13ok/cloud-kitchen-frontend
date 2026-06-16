"use client";

import { createContext, useContext, ReactNode } from "react";

export interface TenantConfig {
  name: string;
  accent: "indigo" | "blue" | "purple" | "green" | "red" | "orange";
  tagline: string;
  logo?: string;
}

export interface TenantContextType {
  tenant: TenantConfig;
}

const defaultTenant: TenantConfig = {
  name: "Mobiloitte",
  accent: "indigo",
  tagline: "Enterprise Workspace",
};

const TenantContext = createContext<TenantContextType>({
  tenant: defaultTenant,
});

interface TenantProviderProps {
  children: ReactNode;
  tenant?: Partial<TenantConfig>;
}

export function TenantProvider({ children, tenant }: TenantProviderProps) {
  const tenantConfig: TenantConfig = {
    ...defaultTenant,
    ...tenant,
  };

  return (
    <TenantContext.Provider value={{ tenant: tenantConfig }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  return context;
}






