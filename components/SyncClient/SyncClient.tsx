"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import SyncIcon from "@mui/icons-material/Sync";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { syncCatalog, fetchTotalTitles, enrichRatings } from "@/lib/syncClient";

interface SyncLog {
  id: string;
  status: string;
  titlesSynced: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface Stats {
  total: number;
  netflix: number;
  prime: number;
  enriched: number;
  pending: number;
}

interface SyncClientProps {
  lastSync: SyncLog | null;
  stats: Stats;
}

export function SyncClient({ lastSync: initial, stats: initialStats }: SyncClientProps) {
  const [syncing, setSyncing] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string; message?: string } | null>(null);
  const [lastSync, setLastSync] = useState(initial);
  const [stats, setStats] = useState(initialStats);

  async function triggerSync() {
    setSyncing(true);
    setResult(null);
    try {
      const data = await syncCatalog();
      setResult({ ok: true, message: `Synced ${data.titlesSynced} titles successfully.` });
      setLastSync({ ...data, id: "", status: "completed", error: null, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() });
      const total = await fetchTotalTitles();
      setStats((prev) => ({ ...prev, total }));
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setSyncing(false);
    }
  }

  async function triggerEnrich() {
    setEnriching(true);
    setResult(null);
    try {
      const data = await enrichRatings();
      setResult({ ok: true, message: `Enriched ${data.enriched} titles. ${data.remaining} still pending.` });
      setStats((prev) => ({ ...prev, enriched: prev.enriched + data.enriched, pending: data.remaining }));
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Network error" });
    } finally {
      setEnriching(false);
    }
  }

  return (
    <Box>
      {result && (
        <Alert severity={result.error ? "error" : "success"} sx={{ mb: 3 }} onClose={() => setResult(null)}>
          {result.error ?? result.message}
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={4}>
        {/* Stat cards */}
        {[
          { label: "Total Titles", value: stats.total },
          { label: "On Netflix", value: stats.netflix },
          { label: "On Prime Video", value: stats.prime },
          { label: "Ratings Fetched", value: stats.enriched },
          { label: "Ratings Pending", value: stats.pending },
        ].map(({ label, value }) => (
          <Card key={label} sx={{ flex: 1, textAlign: "center" }}>
            <CardContent>
              <Typography variant="h4" fontWeight={700}>{value.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Last sync info */}
      {lastSync && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Typography variant="subtitle1" fontWeight={600}>Last Sync</Typography>
              <Chip
                label={lastSync.status}
                size="small"
                color={
                  lastSync.status === "completed"
                    ? "success"
                    : lastSync.status === "failed"
                    ? "error"
                    : "warning"
                }
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Started: {new Date(lastSync.startedAt).toLocaleString()}
            </Typography>
            {lastSync.completedAt && (
              <Typography variant="body2" color="text.secondary">
                Completed: {new Date(lastSync.completedAt).toLocaleString()}
              </Typography>
            )}
            <Typography variant="body2">
              Titles synced: <strong>{lastSync.titlesSynced}</strong>
            </Typography>
            {lastSync.error && (
              <Typography variant="body2" color="error">
                Error: {lastSync.error}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Button
          variant="contained"
          size="large"
          startIcon={syncing ? <CircularProgress size={18} color="inherit" /> : <SyncIcon />}
          onClick={triggerSync}
          disabled={syncing || enriching}
        >
          {syncing ? "Syncing catalog…" : "Sync Catalog Now"}
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={enriching ? <CircularProgress size={18} color="inherit" /> : <AutorenewIcon />}
          onClick={triggerEnrich}
          disabled={syncing || enriching}
        >
          {enriching ? "Fetching ratings…" : "Fetch Ratings (OMDB)"}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" mt={2}>
        The catalog syncs automatically every night at 3am UTC via a Vercel Cron job.
        Ratings are fetched in batches of 100/day (free OMDB tier limit).
      </Typography>
    </Box>
  );
}
