"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import TextField from "@mui/material/TextField";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";

export interface TitleItem {
  id: string;
  title: string;
  year: number | null;
  type: string;
  genres: string[];
  posterUrl: string | null;
  imdbRating: number | null;
  rtScore: number | null;
  metacritic: number | null;
  rated: string | null;
  runtime: string | null;
  plot: string | null;
  director: string | null;
  onNetflix: boolean;
  onPrime: boolean;
  ratingsUpdatedAt: string | null;
}

interface TitleGridProps {
  titles: TitleItem[];
  total: number;
  page: number;
  totalPages: number;
  service?: string;
  sort?: string;
  search?: string;
  fixedType?: "movie" | "show";
}

function rtColor(score: number): string {
  if (score >= 75) return "#fa320a";
  if (score >= 60) return "#f5c518";
  return "#757575";
}

function TitleCard({ item }: { item: TitleItem }) {
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
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
        sx={{ aspectRatio: "2/3", objectFit: "cover" }}
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
          <Chip label="Netflix" size="small" sx={{ bgcolor: "#e50914", color: "#fff", fontWeight: 700 }} />
        )}
        {item.onPrime && (
          <Chip label="Prime" size="small" sx={{ bgcolor: "#00a8e1", color: "#fff", fontWeight: 700 }} />
        )}
        {item.rtScore !== null ? (
          <Tooltip title="Rotten Tomatoes">
            <Chip
              label={`${item.rtScore}%`}
              size="small"
              sx={{ bgcolor: rtColor(item.rtScore), color: "#fff", fontWeight: 700 }}
            />
          </Tooltip>
        ) : (
          <Chip label="RT —" size="small" variant="outlined" />
        )}
        {item.imdbRating !== null && (
          <Tooltip title="IMDb Rating">
            <Chip
              label={`★ ${item.imdbRating}`}
              size="small"
              sx={{ bgcolor: "#f5c518", color: "#000", fontWeight: 700 }}
            />
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
}

export default function TitleGrid({
  titles,
  total,
  page,
  totalPages,
  service,
  sort,
  search,
  fixedType,
}: TitleGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key !== "page") params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Box>
      {/* Filter bar */}
      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3}>
        <TextField
          size="small"
          label="Search"
          defaultValue={search ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam("q", (e.target as HTMLInputElement).value);
            }
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Service</InputLabel>
          <Select
            value={service ?? "all"}
            label="Service"
            onChange={(e) => updateParam("service", e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="netflix">Netflix</MenuItem>
            <MenuItem value="prime">Prime Video</MenuItem>
          </Select>
        </FormControl>
        {!fixedType && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={searchParams.get("type") ?? "all"}
              label="Type"
              onChange={(e) => updateParam("type", e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="movie">Movies</MenuItem>
              <MenuItem value="show">Series</MenuItem>
            </Select>
          </FormControl>
        )}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sort ?? "rtScore"}
            label="Sort by"
            onChange={(e) => updateParam("sort", e.target.value)}
          >
            <MenuItem value="rtScore">Rotten Tomatoes</MenuItem>
            <MenuItem value="imdbRating">IMDb Rating</MenuItem>
            <MenuItem value="year">Year (newest)</MenuItem>
            <MenuItem value="title">Title (A–Z)</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" alignSelf="center">
          {total.toLocaleString()} titles
        </Typography>
      </Stack>

      {/* Title grid */}
      <Grid container spacing={2}>
        {titles.map((item) => (
          <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
            <TitleCard item={item} />
          </Grid>
        ))}
        {titles.length === 0 && (
          <Grid size={12}>
            <Typography color="text.secondary" textAlign="center" py={8}>
              No titles found. Try syncing the catalog first.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => updateParam("page", String(p))}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}
