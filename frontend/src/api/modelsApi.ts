import client from './client';
import type { ModelConfig, ModelConfigCreate } from '../types';

export const listModels = async (): Promise<ModelConfig[]> => {
  const { data } = await client.get('/models');
  return data;
};

export const createModel = async (data: ModelConfigCreate): Promise<ModelConfig> => {
  const { data: result } = await client.post('/models', data);
  return result;
};

export const updateModel = async (id: string, data: ModelConfigCreate): Promise<ModelConfig> => {
  const { data: result } = await client.put(`/models/${id}`, data);
  return result;
};

export const deleteModel = async (id: string): Promise<void> => {
  await client.delete(`/models/${id}`);
};
