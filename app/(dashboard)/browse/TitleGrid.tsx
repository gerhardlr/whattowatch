"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Pagination from "@mui/material/Pagination";
import { TitleCard } from "@/components/TitleCard";
import { FilterBar } from "@/components/FilterBar";

export type { TitleItem } from "@/components/TitleCard";

interface TitleGridProps {
  titles: import("@/components/TitleCard").TitleItem[];
  total: number;
  page: number;
  totalPages: number;
  service?: string;
  sort?: string;
  search?: string;
  fixedType?: "movie" | "show";
  saOnly?: boolean;
  genre?: string;
  decade?: string;
  availableGenres: string[];
  minRt?: string;
  minImdb?: string;
  director?: string;
  actor?: string;
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
  saOnly,
  genre,
  decade,
  availableGenres,
  minRt,
  minImdb,
  director,
  actor,
}: TitleGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSaChange(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) params.set("sa", "1");
    else params.delete("sa");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Box>
      <FilterBar
        search={search}
        service={service}
        sort={sort}
        fixedType={fixedType}
        saOnly={saOnly}
        genre={genre}
        decade={decade}
        availableGenres={availableGenres}
        minRt={minRt}
        minImdb={minImdb}
        director={director}
        actor={actor}
        total={total}
        onParamChange={updateParam}
        onSaChange={handleSaChange}
      />

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
