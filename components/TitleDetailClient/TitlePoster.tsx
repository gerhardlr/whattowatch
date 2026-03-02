import Box from "@mui/material/Box";

interface Props {
  posterUrl: string | null;
  title: string;
}

export function TitlePoster({ posterUrl, title }: Props) {
  return (
    <Box
      component="img"
      src={
        posterUrl ??
        `https://via.placeholder.com/260x390?text=${encodeURIComponent(title)}`
      }
      alt={title}
      sx={{
        width: 260,
        borderRadius: 2,
        boxShadow: 4,
        flexShrink: 0,
        alignSelf: "flex-start",
      }}
    />
  );
}
