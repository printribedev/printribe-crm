"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Sections = Record<string, boolean>;

type Permissions = {
  role: string;
  email: string;
  sections: Sections;
  showFinancials: boolean;
  loading: boolean;
  refresh: () => void;
};

const defaults: Permissions = {
  role: "user",
  email: "",
  sections: {
    dashboard: true, orders: true, clients: true, vendors: true,
    products: true, assets: true, quotes: true, production: true,
  },
  showFinancials: true,
  loading: true,
  refresh: () => {},
};

const PermissionsContext = createContext<Permissions>(defaults);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [perms, setPerms] = useState<Permissions>(defaults);

  function fetchPerms() {
    fetch("/api/me/permissions")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setPerms(p => ({ ...p, ...data, loading: false, refresh: fetchPerms }));
        else setPerms(p => ({ ...p, loading: false }));
      })
      .catch(() => setPerms(p => ({ ...p, loading: false })));
  }

  useEffect(() => { fetchPerms(); }, []);

  return (
    <PermissionsContext.Provider value={{ ...perms, refresh: fetchPerms }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
