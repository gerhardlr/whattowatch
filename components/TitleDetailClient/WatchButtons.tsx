import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

interface Props {
  onNetflix: boolean;
  onPrime: boolean;
  titleName: string;
}

export function WatchButtons({ onNetflix, onPrime, titleName }: Props) {
  if (!onNetflix && !onPrime) return null;

  const netflixUrl = `https://www.netflix.com/search?q=${encodeURIComponent(titleName)}`;
  const primeUrl = `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(titleName)}`;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {onNetflix && (
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
      {onPrime && (
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
  );
}
