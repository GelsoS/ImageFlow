
"use client"
// context/DebugPanelContext.jsx
import { createContext, useContext, useState } from 'react';

const DebugPanelContext = createContext();

export function DebugPanelProvider({ children }) {
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  return (
    <DebugPanelContext.Provider value={{ showDebugPanel, setShowDebugPanel }}>
      {children}
    </DebugPanelContext.Provider>
  );
}

export function useDebugPanel() {
  return useContext(DebugPanelContext);
}
