"use client";

import App from "../src/App";
import { DebugPanelProvider } from "../context/DebugPanelContext"; // ajuste o caminho se necessário

export default function Page() {
  return (
    <DebugPanelProvider>
      <App />
    </DebugPanelProvider>
  );
}
