import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "../../../firebase/config";
import type {
  UploadedFileRecord,
  UploadFileInput,
  UpdateUploadInput,
} from "../types/upload";

const UPLOADS_COLLECTION = "uploads";
export const MAX_UPLOAD_SIZE_MB = 200;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

class FirebaseUploadService {
  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  private buildStoragePath(userId: string, originalName: string): string {
    const safeName = this.sanitizeFileName(originalName);
    return `users/${userId}/uploads/${Date.now()}_${safeName}`;
  }

  private sortByUpdatedAtDesc(items: UploadedFileRecord[]): UploadedFileRecord[] {
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listUserUploads(userId: string): Promise<UploadedFileRecord[]> {
    const uploadsRef = collection(db, UPLOADS_COLLECTION);
    const uploadsQuery = query(uploadsRef, where("userId", "==", userId));
    const snapshot = await getDocs(uploadsQuery);

    const records = snapshot.docs.map((uploadDoc) => ({
      id: uploadDoc.id,
      ...(uploadDoc.data() as Omit<UploadedFileRecord, "id">),
    }));

    return this.sortByUpdatedAtDesc(records);
  }

  async uploadFile(input: UploadFileInput): Promise<UploadedFileRecord> {
    const { userId, file, displayName } = input;

    if (!file) {
      throw new Error("Please select a file to upload.");
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(`File exceeds ${MAX_UPLOAD_SIZE_MB} MB.`);
    }

    const storagePath = this.buildStoragePath(userId, file.name);
    const fileRef = ref(storage, storagePath);

    await uploadBytes(fileRef, file, {
      contentType: file.type || "application/octet-stream",
    });

    const downloadURL = await getDownloadURL(fileRef);
    const now = new Date().toISOString();

    const payload: Omit<UploadedFileRecord, "id"> = {
      userId,
      displayName: displayName?.trim() || file.name,
      originalFileName: file.name,
      fileSize: file.size,
      contentType: file.type || "application/octet-stream",
      storagePath,
      downloadURL,
      createdAt: now,
      updatedAt: now,
    };

    const created = await addDoc(collection(db, UPLOADS_COLLECTION), payload);
    return { id: created.id, ...payload };
  }

  async updateUpload(input: UpdateUploadInput): Promise<UploadedFileRecord> {
    const { record, displayName, file } = input;
    const uploadDocRef = doc(db, UPLOADS_COLLECTION, record.id);
    const now = new Date().toISOString();

    if (!file) {
      const updatedPayload = {
        displayName: displayName.trim() || record.originalFileName,
        updatedAt: now,
      };

      await updateDoc(uploadDocRef, updatedPayload);

      return {
        ...record,
        ...updatedPayload,
      };
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(`File exceeds ${MAX_UPLOAD_SIZE_MB} MB.`);
    }

    const oldPath = record.storagePath;
    const newStoragePath = this.buildStoragePath(record.userId, file.name);
    const newFileRef = ref(storage, newStoragePath);

    await uploadBytes(newFileRef, file, {
      contentType: file.type || "application/octet-stream",
    });

    const newDownloadURL = await getDownloadURL(newFileRef);

    const updatedPayload = {
      displayName: displayName.trim() || file.name,
      originalFileName: file.name,
      fileSize: file.size,
      contentType: file.type || "application/octet-stream",
      storagePath: newStoragePath,
      downloadURL: newDownloadURL,
      updatedAt: now,
    };

    await updateDoc(uploadDocRef, updatedPayload);

    try {
      await deleteObject(ref(storage, oldPath));
    } catch (error) {
      console.error("Could not delete old file after replacement:", error);
    }

    return {
      ...record,
      ...updatedPayload,
    };
  }

  async deleteUpload(record: UploadedFileRecord): Promise<void> {
    await Promise.all([
      deleteDoc(doc(db, UPLOADS_COLLECTION, record.id)),
      deleteObject(ref(storage, record.storagePath)),
    ]);
  }

  async getFreshDownloadUrl(record: UploadedFileRecord): Promise<string> {
    const storageRef = ref(storage, record.storagePath);
    return getDownloadURL(storageRef);
  }

  async download(record: UploadedFileRecord): Promise<void> {
    const url = await this.getFreshDownloadUrl(record);
    const link = document.createElement("a");
    link.href = url;
    link.download = record.originalFileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const firebaseUploadService = new FirebaseUploadService();
