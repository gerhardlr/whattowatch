import { Suspense } from "react";
import { TitlePageContent, TitlePageSearchParams } from "@/components/TitlePageContent";
import type { FilterSpec } from "@/types";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

const FILTER: FilterSpec = {
  genres: ["Drama"],
  minRt: 70,
};

export default async function DramaPage({
  searchParams,
}: {
  searchParams: Promise<TitlePageSearchParams>;
}) {
  const params = await searchParams;
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      }
    >
      <TitlePageContent searchParams={params} filterSpec={FILTER} />
    </Suspense>
  );
}
