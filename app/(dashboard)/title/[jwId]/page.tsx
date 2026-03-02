import { notFound } from "next/navigation";
import Link from "next/link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { prisma } from "@/lib/prisma";
import { findTmdbByImdb, getRecommendationImdbIds } from "@/lib/tmdb";
import { TitleCard, rtColor } from "@/components/TitleCard";

export default async function TitleDetailPage({
  params,
}: {
  params: Promise<{ jwId: string }>;
}) {
  const { jwId } = await params;

  const title = await prisma.title.findUnique({ where: { jwId } });
  if (!title) notFound();

  // Fetch similar titles via TMDB
  let similar: typeof title[] = [];
  if (title.imdbId) {
    const tmdb = await findTmdbByImdb(title.imdbId);
    if (tmdb) {
      const ids = await getRecommendationImdbIds(tmdb.tmdbId, tmdb.mediaType);
      similar = await prisma.title.findMany({
        where: { imdbId: { in: ids }, OR: [{ onNetflix: true }, { onPrime: true }] },
        take: 12,
      });
    }
  }

  const imdbUrl = title.imdbId ? `https://www.imdb.com/title/${title.imdbId}` : null;
  const rtUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title.title)}`;
  const netflixUrl = `https://www.netflix.com/search?q=${encodeURIComponent(title.title)}`;
  const primeUrl = `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(title.title)}`;

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
        {/* Poster */}
        <Box
          component="img"
          src={
            title.posterUrl ??
            `https://via.placeholder.com/260x390?text=${encodeURIComponent(title.title)}`
          }
          alt={title.title}
          sx={{
            width: 260,
            borderRadius: 2,
            boxShadow: 4,
            flexShrink: 0,
            alignSelf: "flex-start",
          }}
        />

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

          {/* Ratings */}
          <Stack direction="row" spacing={1} flexWrap="wrap" mb={3}>
            {title.rtScore !== null && (
              <Chip
                component="a"
                href={rtUrl}
                target="_blank"
                rel="noopener noreferrer"
                label={`🍅 ${title.rtScore}%`}
                clickable
                sx={{
                  bgcolor: rtColor(title.rtScore),
                  color: "#fff",
                  fontWeight: 700,
                }}
              />
            )}
            {title.imdbRating !== null && imdbUrl && (
              <Chip
                component="a"
                href={imdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                label={`★ ${title.imdbRating}/10 IMDb`}
                clickable
                sx={{ bgcolor: "#f5c518", color: "#000", fontWeight: 700 }}
              />
            )}
            {title.metacritic !== null && (
              <Chip
                label={`MC ${title.metacritic}`}
                sx={{ bgcolor: "#62bb44", color: "#fff", fontWeight: 700 }}
              />
            )}
          </Stack>

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

          {/* Watch buttons */}
          {(title.onNetflix || title.onPrime) && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {title.onNetflix && (
                <Button
                  component="a"
                  href={netflixUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  sx={{ bgcolor: "#e50914", "&:hover": { bgcolor: "#b20710" } }}
                >
                  Watch on Netflix
                </Button>
              )}
              {title.onPrime && (
                <Button
                  component="a"
                  href={primeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  sx={{ bgcolor: "#00a8e1", "&:hover": { bgcolor: "#007eb0" } }}
                >
                  Watch on Prime Video
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Box>

      {/* Similar titles */}
      {similar.length > 0 && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" fontWeight={700} mb={2}>
            Similar Titles
          </Typography>
          <Grid container spacing={2}>
            {similar.map((s) => (
              <Grid key={s.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                <TitleCard
                  item={{
                    ...s,
                    ratingsUpdatedAt: s.ratingsUpdatedAt?.toISOString() ?? null,
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}
