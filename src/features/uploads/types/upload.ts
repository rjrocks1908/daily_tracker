export interface UploadedFileRecord {
  id: string;
  userId: string;
  displayName: string;
  originalFileName: string;
  fileSize: number;
  contentType: string;
  storagePath: string;
  downloadURL: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadFileInput {
  userId: string;
  file: File;
  displayName?: string;
}

export interface UpdateUploadInput {
  record: UploadedFileRecord;
  displayName: string;
  file?: File | null;
}
