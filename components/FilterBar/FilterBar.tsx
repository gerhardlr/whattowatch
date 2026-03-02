"use client";

import { useState, useEffect } from "react";
import { DISNEY_ENABLED } from "@/lib/features";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

const DECADES = [
  { value: "2020", label: "2020s" },
  { value: "2010", label: "2010s" },
  { value: "2000", label: "2000s" },
  { value: "1990", label: "1990s" },
  { value: "1980", label: "1980s" },
  { value: "classic", label: "Before 1980" },
];

export interface FilterBarProps {
  search?: string;
  service?: string;
  sort?: string;
  fixedType?: "movie" | "show";
  saOnly?: boolean;
  includeRentBuy?: boolean;
  genres?: string[];
  excludeGenres?: string[];
  decade?: string;
  availableGenres: string[];
  minRt?: string;
  minImdb?: string;
  director?: string;
  actor?: string;
  total: number;
  onParamChange: (key: string, value: string) => void;
  onSaChange: (checked: boolean) => void;
  onIncludeRentBuyChange: (checked: boolean) => void;
}

const RENT_BUY_SERVICES = new Set(["prime", "apple"]);

export function FilterBar({
  search,
  service,
  sort,
  fixedType,
  saOnly,
  includeRentBuy,
  genres,
  excludeGenres,
  decade,
  availableGenres,
  minRt,
  minImdb,
  director,
  actor,
  total,
  onParamChange,
  onSaChange,
  onIncludeRentBuyChange,
}: FilterBarProps) {
  const effectiveGenres =
    genres && genres.length > 0 && genres.length < availableGenres.length
      ? genres
      : availableGenres;

  const [selectedGenres, setSelectedGenres] = useState<string[]>(effectiveGenres);
  const [selectedExcludeGenres, setSelectedExcludeGenres] = useState<string[]>(excludeGenres ?? []);

  // Sync local state when the genres URL param changes (navigation)
  const genresKey = genres ? genres.join(",") : "";
  const excludeGenresKey = excludeGenres ? excludeGenres.join(",") : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSelectedGenres(effectiveGenres); }, [genresKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSelectedExcludeGenres(excludeGenres ?? []); }, [excludeGenresKey]);

  const allGenresSelected = selectedGenres.length === availableGenres.length;

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        {/* Row 1: Search, Service, Type, Sort */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Search"
            defaultValue={search ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                onParamChange("q", (e.target as HTMLInputElement).value);
            }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Service</InputLabel>
            <Select
              value={service ?? "all"}
              label="Service"
              onChange={(e) => onParamChange("service", e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="netflix">Netflix</MenuItem>
              <MenuItem value="prime">Prime Video</MenuItem>
              {DISNEY_ENABLED && <MenuItem value="disney">Disney+</MenuItem>}
              <MenuItem value="apple">Apple TV+</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {!fixedType && (
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value="all"
                label="Type"
                onChange={(e) => onParamChange("type", e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="movie">Movies</MenuItem>
                <MenuItem value="show">Series</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}
        <Grid size={{ xs: 6, sm: 3, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sort ?? "rtScore"}
              label="Sort by"
              onChange={(e) => onParamChange("sort", e.target.value)}
            >
              <MenuItem value="rtScore">Rotten Tomatoes</MenuItem>
              <MenuItem value="imdbRating">IMDb Rating</MenuItem>
              <MenuItem value="year">Year (newest)</MenuItem>
              <MenuItem value="title">Title (A–Z)</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Row 2: Genre, Decade, Min RT, Min IMDb, Director, Actor */}
        {availableGenres.length > 0 && (
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel shrink>Genre</InputLabel>
              <Select
                multiple
                displayEmpty
                size="small"
                label="Genre"
                notched
                value={selectedGenres}
                onChange={(e) => {
                  const val = e.target.value as string[];
                  setSelectedGenres(val);
                  if (val.length === 0 || val.length === availableGenres.length) {
                    onParamChange("genres", "");
                  } else {
                    onParamChange("genres", val.join(","));
                  }
                }}
                renderValue={(selected) =>
                  selected.length === 0
                    ? "No genres"
                    : selected.length === availableGenres.length
                    ? "All Genres"
                    : `${selected.length} genre${selected.length !== 1 ? "s" : ""}`
                }
              >
                <MenuItem
                  dense
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (allGenresSelected) {
                      setSelectedGenres([]);
                    } else {
                      setSelectedGenres(availableGenres);
                      onParamChange("genres", "");
                    }
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={allGenresSelected}
                    indeterminate={selectedGenres.length > 0 && !allGenresSelected}
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
                <Divider />
                {availableGenres.map((g) => (
                  <MenuItem key={g} value={g} dense>
                    <Checkbox size="small" checked={selectedGenres.includes(g)} />
                    <ListItemText primary={g} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        {availableGenres.length > 0 && (
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel shrink>Exclude Genre</InputLabel>
              <Select
                multiple
                displayEmpty
                size="small"
                label="Exclude Genre"
                notched
                value={selectedExcludeGenres}
                onChange={(e) => {
                  const val = e.target.value as string[];
                  setSelectedExcludeGenres(val);
                  onParamChange("excludeGenres", val.join(","));
                }}
                renderValue={(selected) =>
                  selected.length === 0
                    ? "None"
                    : `${selected.length} excluded`
                }
              >
                {availableGenres.map((g) => (
                  <MenuItem key={g} value={g} dense>
                    <Checkbox size="small" checked={selectedExcludeGenres.includes(g)} />
                    <ListItemText primary={g} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Decade</InputLabel>
            <Select
              value={decade ?? ""}
              label="Decade"
              onChange={(e) => onParamChange("decade", e.target.value)}
            >
              <MenuItem value="">All Decades</MenuItem>
              {DECADES.map((d) => (
                <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Min RT</InputLabel>
            <Select
              value={minRt ?? ""}
              label="Min RT"
              onChange={(e) => onParamChange("minRt", e.target.value)}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="60">60%+</MenuItem>
              <MenuItem value="70">70%+</MenuItem>
              <MenuItem value="75">75%+</MenuItem>
              <MenuItem value="80">80%+</MenuItem>
              <MenuItem value="90">90%+</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Min IMDb</InputLabel>
            <Select
              value={minImdb ?? ""}
              label="Min IMDb"
              onChange={(e) => onParamChange("minImdb", e.target.value)}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="6">6+</MenuItem>
              <MenuItem value="6.5">6.5+</MenuItem>
              <MenuItem value="7">7+</MenuItem>
              <MenuItem value="7.5">7.5+</MenuItem>
              <MenuItem value="8">8+</MenuItem>
              <MenuItem value="8.5">8.5+</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Director"
            defaultValue={director ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                onParamChange("director", (e.target as HTMLInputElement).value);
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Actor"
            defaultValue={actor ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                onParamChange("actor", (e.target as HTMLInputElement).value);
            }}
          />
        </Grid>

        {/* Row 3: SA toggle + Rent/Buy toggle + count */}
        <Grid size={12}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <FormControlLabel
              control={
                <Switch
                  checked={saOnly ?? false}
                  onChange={(e) => onSaChange(e.target.checked)}
                  size="small"
                />
              }
              label="Available in SA"
            />
            {RENT_BUY_SERVICES.has(service ?? "") && (
              <FormControlLabel
                control={
                  <Switch
                    checked={includeRentBuy ?? false}
                    onChange={(e) => onIncludeRentBuyChange(e.target.checked)}
                    size="small"
                  />
                }
                label="Include Rent/Buy"
              />
            )}
            <Typography variant="body2" color="text.secondary">
              {total.toLocaleString()} titles
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
