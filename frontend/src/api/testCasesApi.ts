import client from './client';
import type { TestCase, TestCaseCreate } from '../types';

export const listTestCases = async (): Promise<TestCase[]> => {
  const { data } = await client.get('/test-cases');
  return data;
};

export const createTestCase = async (data: TestCaseCreate): Promise<TestCase> => {
  const { data: result } = await client.post('/test-cases', data);
  return result;
};

export const updateTestCase = async (id: string, data: TestCaseCreate): Promise<TestCase> => {
  const { data: result } = await client.put(`/test-cases/${id}`, data);
  return result;
};

export const deleteTestCase = async (id: string): Promise<void> => {
  await client.delete(`/test-cases/${id}`);
};
