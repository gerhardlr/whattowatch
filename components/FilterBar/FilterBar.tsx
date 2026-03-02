"use client";

import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
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
  genre?: string;
  decade?: string;
  availableGenres: string[];
  minRt?: string;
  minImdb?: string;
  director?: string;
  actor?: string;
  total: number;
  onParamChange: (key: string, value: string) => void;
  onSaChange: (checked: boolean) => void;
}

export function FilterBar({
  search,
  service,
  sort,
  fixedType,
  saOnly,
  genre,
  decade,
  availableGenres,
  minRt,
  minImdb,
  director,
  actor,
  total,
  onParamChange,
  onSaChange,
}: FilterBarProps) {
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
              <InputLabel>Genre</InputLabel>
              <Select
                value={genre ?? ""}
                label="Genre"
                onChange={(e) => onParamChange("genre", e.target.value)}
              >
                <MenuItem value="">All Genres</MenuItem>
                {availableGenres.map((g) => (
                  <MenuItem key={g} value={g}>{g}</MenuItem>
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

        {/* Row 3: SA toggle + count */}
        <Grid size={12}>
          <Box display="flex" alignItems="center" gap={2}>
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
            <Typography variant="body2" color="text.secondary">
              {total.toLocaleString()} titles
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
