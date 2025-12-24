"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface NavigationContextType {
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <NavigationContext.Provider
      value={{
        isMenuOpen,
        openMenu: () => setIsMenuOpen(true),
        closeMenu: () => setIsMenuOpen(false),
        toggleMenu: () => setIsMenuOpen((prev) => !prev),
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}
