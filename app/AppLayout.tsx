"use client";

import { NextAppProvider } from "@toolpad/core/nextjs";
import type { Navigation } from "@toolpad/core/AppProvider";
import MovieIcon from "@mui/icons-material/Movie";
import TvIcon from "@mui/icons-material/Tv";
import GridViewIcon from "@mui/icons-material/GridView";
import SyncIcon from "@mui/icons-material/Sync";

const navigation: Navigation = [
  { segment: "browse", title: "Browse All", icon: <GridViewIcon /> },
  { segment: "movies", title: "Movies", icon: <MovieIcon /> },
  { segment: "series", title: "Series", icon: <TvIcon /> },
  { kind: "divider" },
  { segment: "sync", title: "Sync Catalog", icon: <SyncIcon /> },
];

const branding = { title: "WhatToWatch" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NextAppProvider navigation={navigation} branding={branding}>
      {children}
    </NextAppProvider>
  );
}
