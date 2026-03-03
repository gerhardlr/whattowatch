import { Suspense } from "react";
import { TitlePageContent, TitlePageSearchParams } from "@/components/TitlePageContent";
import type { FilterSpec } from "@/types";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

const FILTER: FilterSpec = {
  minRt: 80,
  minImdb: 7,
};

export default async function AcclaimedPage({
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
