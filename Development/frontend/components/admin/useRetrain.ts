"use client";

import { useEffect, useState } from "react";
import { ApiError, errorMessage, getLatestRetrain, startRetrain } from "@/lib/api";
import type { RetrainRun } from "@/lib/notice-types";

const POLL_MS = 5000;

export function useRetrain() {
  const [run, setRun] = useState<RetrainRun | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [misses, setMisses] = useState(0);
  const running = run?.status === "running";

  useEffect(() => {
    if (!running) return;
    let live = true;
    const timer = window.setTimeout(() => {
      getLatestRetrain()
        .then((latest) => {
          if (live) setRun(latest);
        })
        .catch(() => {
          if (live) setMisses((n) => n + 1);
        });
    }, POLL_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [running, run, misses]);

  async function start() {
    setStarting(true);
    setError("");
    setNotice("");
    try {
      setRun(await startRetrain());
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNotice(err.message);
        const latest = await getLatestRetrain().catch(() => null);
        if (latest) setRun(latest);
        return false;
      }
      setError(errorMessage(err, "The retrain could not be started."));
      return false;
    } finally {
      setStarting(false);
    }
  }

  return { run, setRun, start, starting, error, notice };
}
