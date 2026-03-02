import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { TitleCard } from "@/components/TitleCard";
import type { TitleItem } from "@/types";

interface Props {
  similar: TitleItem[];
}

export function SimilarTitles({ similar }: Props) {
  if (similar.length === 0) return null;

  return (
    <>
      <Divider sx={{ mb: 3 }} />
      <Typography variant="h6" fontWeight={700} mb={2}>
        Similar Titles
      </Typography>
      <Grid container spacing={2}>
        {similar.map((s) => (
          <Grid key={s.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
            <TitleCard item={s} />
          </Grid>
        ))}
      </Grid>
    </>
  );
}
