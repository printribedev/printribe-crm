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
  canDo: (section: string, action: "create" | "edit" | "delete") => boolean;
};

const DEFAULT_SECTIONS: Sections = {
  dashboard: true, orders: true, clients: true, vendors: true,
  products: true, assets: true, quotes: true, production: true,
  "orders.create": true, "orders.edit": true, "orders.delete": true,
  "clients.create": true, "clients.edit": true, "clients.delete": true,
  "products.create": true, "products.edit": true, "products.delete": true,
  "vendors.create": true, "vendors.edit": true, "vendors.delete": true,
  "assets.create": true, "assets.edit": true, "assets.delete": true,
  "quotes.create": true, "quotes.edit": true, "quotes.delete": true,
};

function makeCanDo(sections: Sections) {
  return (section: string, action: "create" | "edit" | "delete") =>
    sections[`${section}.${action}`] !== false;
}

const defaults: Permissions = {
  role: "user",
  email: "",
  sections: DEFAULT_SECTIONS,
  showFinancials: true,
  loading: true,
  refresh: () => {},
  canDo: () => true,
};

const PermissionsContext = createContext<Permissions>(defaults);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [perms, setPerms] = useState<Permissions>(defaults);

  function fetchPerms() {
    fetch("/api/me/permissions")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          const merged = { ...DEFAULT_SECTIONS, ...(data.sections ?? {}) };
          setPerms(p => ({ ...p, ...data, sections: merged, loading: false, refresh: fetchPerms, canDo: makeCanDo(merged) }));
        } else setPerms(p => ({ ...p, loading: false }));
      })
      .catch(() => setPerms(p => ({ ...p, loading: false })));
  }

  useEffect(() => { fetchPerms(); }, []);

  return (
    <PermissionsContext.Provider value={{ ...perms, refresh: fetchPerms, canDo: makeCanDo(perms.sections) }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
