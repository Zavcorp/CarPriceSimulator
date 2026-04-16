export interface UploadHistory {
  id: string;
  admin_id: string;
  filename: string;
  vehicles_count: number;
  status: 'success' | 'error';
  error_message?: string;
  uploaded_at: string;
}
