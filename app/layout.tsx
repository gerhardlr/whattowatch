import type { Metadata } from "next";
import { Suspense } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import AppLayout from "./AppLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhatToWatch",
  description: "Browse Netflix and Prime Video catalogs with Rotten Tomatoes scores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <Suspense>
            <AppLayout>{children}</AppLayout>
          </Suspense>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
