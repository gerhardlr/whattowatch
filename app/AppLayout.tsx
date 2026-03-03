"use client";

import { NextAppProvider } from "@toolpad/core/nextjs";
import type { Navigation } from "@toolpad/core/AppProvider";
import MovieIcon from "@mui/icons-material/Movie";
import TvIcon from "@mui/icons-material/Tv";
import GridViewIcon from "@mui/icons-material/GridView";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SearchIcon from "@mui/icons-material/Search";
import PublicIcon from "@mui/icons-material/Public";
import TheaterComedyIcon from "@mui/icons-material/TheaterComedy";

const navigation: Navigation = [
  { segment: "browse", title: "Browse All", icon: <GridViewIcon /> },
  { segment: "movies", title: "Movies", icon: <MovieIcon /> },
  { segment: "series", title: "Series", icon: <TvIcon /> },
  { kind: "divider" },
  { kind: "header", title: "Curated" },
  { segment: "action", title: "Action", icon: <WhatshotIcon /> },
  { segment: "acclaimed", title: "Acclaimed", icon: <EmojiEventsIcon /> },
  { segment: "crime", title: "Crime", icon: <SearchIcon /> },
  { segment: "european", title: "Made in Europe", icon: <PublicIcon /> },
  { segment: "drama", title: "Drama", icon: <TheaterComedyIcon /> },
];

const branding = { title: "WhatToWatch" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NextAppProvider navigation={navigation} branding={branding}>
      {children}
    </NextAppProvider>
  );
}
