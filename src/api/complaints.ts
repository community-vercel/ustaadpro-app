import { apiClient } from './client';

export type BookedService = {
  service: string;
  sub_service: string | null;
};

export async function fetchMyBookedServices(): Promise<BookedService[]> {
  const { data } = await apiClient.get('/complaints/my-services');
  return data.services || [];
}

export async function submitComplaint(formData: FormData): Promise<any> {
  const { data } = await apiClient.post('/complaints', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}
