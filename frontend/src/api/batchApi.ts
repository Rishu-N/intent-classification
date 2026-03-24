import client from './client';
import type { BatchRunRequest, BatchRunResult } from '../types';

export const runBatch = async (req: BatchRunRequest): Promise<BatchRunResult> => {
  const { data } = await client.post('/batch/run', req);
  return data;
};

export const getExportUrl = (runId: string, format: 'csv' | 'json'): string => {
  return `/export?run_id=${runId}&format=${format}`;
};

export const getCacheStats = async () => {
  const { data } = await client.get('/cache');
  return data;
};

export const clearCache = async () => {
  const { data } = await client.delete('/cache');
  return data;
};
