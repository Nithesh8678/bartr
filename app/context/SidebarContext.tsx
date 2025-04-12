"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  isRequestsSidebarOpen: boolean;
  openRequestsSidebar: () => void;
  closeRequestsSidebar: () => void;
  toggleRequestsSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isRequestsSidebarOpen, setIsRequestsSidebarOpen] = useState(false);

  const openRequestsSidebar = () => setIsRequestsSidebarOpen(true);
  const closeRequestsSidebar = () => setIsRequestsSidebarOpen(false);
  const toggleRequestsSidebar = () => setIsRequestsSidebarOpen((prev) => !prev);

  return (
    <SidebarContext.Provider
      value={{
        isRequestsSidebarOpen,
        openRequestsSidebar,
        closeRequestsSidebar,
        toggleRequestsSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
