"use client";

import dynamic from "next/dynamic";

const MsalProviderComponent = dynamic(
  () => import("./components/MsalProviderComponent"),
  {
    ssr: false,   // ✅ ensures no SSR attempt
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div>Loading authentication...</div>
      </div>
    ),
  }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return <MsalProviderComponent>{children}</MsalProviderComponent>;
}