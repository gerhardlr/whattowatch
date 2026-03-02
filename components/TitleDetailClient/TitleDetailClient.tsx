"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import type { TitleItem } from "@/types";
import { TitlePoster } from "./TitlePoster";
import { TitleRatings } from "./TitleRatings";
import { WatchButtons } from "./WatchButtons";
import { SimilarTitles } from "./SimilarTitles";

interface Props {
  title: TitleItem;
  similar: TitleItem[];
}

export function TitleDetailClient({ title, similar }: Props) {
  const meta = [
    title.year,
    title.type === "show" ? "Series" : "Movie",
    title.rated,
    title.runtime,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box>
      {/* Back */}
      <Button
        component={Link}
        href="/browse"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3 }}
        variant="text"
      >
        Browse
      </Button>

      {/* Hero: poster + details */}
      <Box sx={{ display: "flex", gap: 4, mb: 5, flexWrap: "wrap" }}>
        <TitlePoster posterUrl={title.posterUrl} title={title.title} />

        {/* Details */}
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {title.title}
          </Typography>

          {meta && (
            <Typography variant="body2" color="text.secondary" mb={2}>
              {meta}
            </Typography>
          )}

          {/* Genre chips */}
          {title.genres.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
              {title.genres.map((g) => (
                <Chip key={g} label={g} size="small" variant="outlined" />
              ))}
            </Stack>
          )}

          <TitleRatings
            rtScore={title.rtScore}
            imdbRating={title.imdbRating}
            imdbId={title.imdbId}
            metacritic={title.metacritic}
            titleName={title.title}
          />

          {/* Synopsis */}
          {title.plot && (
            <Typography variant="body1" mb={2} sx={{ lineHeight: 1.7 }}>
              {title.plot}
            </Typography>
          )}

          {/* Director & Cast */}
          {title.director && (
            <Typography variant="body2" mb={0.5}>
              <strong>Director:</strong> {title.director}
            </Typography>
          )}
          {title.actors && (
            <Typography variant="body2" mb={3}>
              <strong>Cast:</strong> {title.actors}
            </Typography>
          )}

          <WatchButtons
            onNetflix={title.onNetflix}
            onPrime={title.onPrime}
            onApple={title.onApple}
            titleName={title.title}
          />
        </Box>
      </Box>

      <SimilarTitles similar={similar} />
    </Box>
  );
}
