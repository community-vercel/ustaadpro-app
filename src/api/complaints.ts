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

export type Complaint = {
  id: number;
  name: string;
  phone: string;
  service: string;
  sub_service: string | null;
  description: string | null;
  status: 'pending' | 'in-review' | 'resolved' | 'rejected';
  created_at: string;
};

export async function fetchMyComplaints(): Promise<Complaint[]> {
  const { data } = await apiClient.get('/complaints/me');
  return data.complaints || [];
}
