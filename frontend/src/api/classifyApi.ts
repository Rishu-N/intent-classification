import client from './client';
import type { ClassifyRequest, ClassifyResult, IntentTree } from '../types';

export const classify = async (req: ClassifyRequest): Promise<ClassifyResult> => {
  const { data } = await client.post('/classify', req);
  return data;
};

export const getIntentTree = async (): Promise<IntentTree> => {
  const { data } = await client.get('/classify/intent-tree');
  return data;
};
