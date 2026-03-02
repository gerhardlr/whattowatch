"use client";

import type { TitleItem } from "@/types";
import Link from "next/link";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";

export type { TitleItem };

export function rtColor(score: number): string {
  if (score >= 75) return "#fa320a";
  if (score >= 60) return "#f5c518";
  return "#757575";
}

export function TitleCard({ item }: { item: TitleItem }) {
  return (
    <Card
      component={Link}
      href={`/title/${item.jwId}`}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.15s",
        "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
      }}
    >
      <CardMedia
        component="img"
        image={
          item.posterUrl ??
          `https://via.placeholder.com/166x240?text=${encodeURIComponent(item.title)}`
        }
        alt={item.title}
        sx={{ aspectRatio: "2/3", objectFit: "cover", display: "block" }}
      />
      <CardContent sx={{ flexGrow: 1, pb: 0 }}>
        <Typography variant="subtitle2" fontWeight={700} noWrap title={item.title}>
          {item.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.year ?? "—"} · {item.runtime ?? "—"}
        </Typography>
        {item.rated && (
          <Chip
            label={item.rated}
            size="small"
            variant="outlined"
            sx={{ ml: 0.5, height: 16, fontSize: 10 }}
          />
        )}
      </CardContent>
      <CardActions sx={{ pt: 0, flexWrap: "wrap", gap: 0.5, px: 1, pb: 1 }}>
        {item.onNetflix && (
          <Chip
            label="Netflix"
            size="small"
            sx={{ bgcolor: "#e50914", color: "#fff", fontWeight: 700 }}
          />
        )}
        {item.onPrime && (
          <Chip
            label="Prime"
            size="small"
            sx={{ bgcolor: "#00a8e1", color: "#fff", fontWeight: 700 }}
          />
        )}
        {item.rtScore !== null ? (
          <Chip
            label={`${item.rtScore}%`}
            size="small"
            sx={{ bgcolor: rtColor(item.rtScore), color: "#fff", fontWeight: 700 }}
          />
        ) : (
          <Chip label="RT —" size="small" variant="outlined" />
        )}
        {item.imdbRating !== null && (
          <Chip
            label={`★ ${item.imdbRating}`}
            size="small"
            sx={{ bgcolor: "#f5c518", color: "#000", fontWeight: 700 }}
          />
        )}
      </CardActions>
    </Card>
  );
}
