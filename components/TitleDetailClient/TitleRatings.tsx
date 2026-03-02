import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { rtColor } from "@/components/TitleCard";

interface Props {
  rtScore: number | null;
  imdbRating: number | null;
  imdbId: string | null;
  metacritic: number | null;
  titleName: string;
}

export function TitleRatings({ rtScore, imdbRating, imdbId, metacritic, titleName }: Props) {
  const rtUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(titleName)}`;
  const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}` : null;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" mb={3}>
      {rtScore !== null && (
        <Chip
          component="a"
          href={rtUrl}
          target="_blank"
          rel="noopener noreferrer"
          label={`🍅 ${rtScore}%`}
          clickable
          sx={{ bgcolor: rtColor(rtScore), color: "#fff", fontWeight: 700 }}
        />
      )}
      {imdbRating !== null && imdbUrl && (
        <Chip
          component="a"
          href={imdbUrl}
          target="_blank"
          rel="noopener noreferrer"
          label={`★ ${imdbRating}/10 IMDb`}
          clickable
          sx={{ bgcolor: "#f5c518", color: "#000", fontWeight: 700 }}
        />
      )}
      {metacritic !== null && (
        <Chip
          label={`MC ${metacritic}`}
          sx={{ bgcolor: "#62bb44", color: "#fff", fontWeight: 700 }}
        />
      )}
    </Stack>
  );
}
