import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import type { UploadTaskSnapshot } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';

export interface FileUploadProgress {
  progress: number;
  snapshot: UploadTaskSnapshot;
}

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
  path: string;
}

class FileUploadService {
  private maxFileSize = 5 * 1024 * 1024; // 5MB in bytes

  // Check if file size is within limit
  validateFileSize(file: File): boolean {
    return file.size <= this.maxFileSize;
  }

  // Check if file type is supported
  validateFileType(file: File): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return supportedTypes.includes(file.type);
  }

  // Generate unique file path
  private generateFilePath(workspaceId: string, channelId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `workspaces/${workspaceId}/channels/${channelId}/${timestamp}_${sanitizedFileName}`;
  }

  // Upload file with progress tracking
  async uploadFile(
    file: File, 
    workspaceId: string, 
    channelId: string,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<UploadedFile> {
    // Validate file
    if (!this.validateFileSize(file)) {
      throw new Error(`File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    if (!this.validateFileType(file)) {
      throw new Error(`File type ${file.type} is not supported`);
    }

    // If Firebase is not configured, return a mock uploaded file
    if (!isFirebaseConfigured) {
      console.warn('⚠️ Firebase not configured, using local file URL (demo mode)');
      
      // Create a more persistent local URL for demo mode
      const mockUrl = URL.createObjectURL(file);
      
      // Store the file blob temporarily for demo mode
      const fileData = {
        url: mockUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        path: `demo/${file.name}`,
        blob: file // Keep reference to original blob for demo mode
      };
      
      return fileData as UploadedFile;
    }

    const filePath = this.generateFilePath(workspaceId, channelId, file.name);
    const storageRef = ref(storage, filePath);

    try {
      if (onProgress) {
        // Upload with progress tracking
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        return new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress({ progress, snapshot });
            },
            (error) => {
              console.error('Upload error:', error);
              reject(new Error(`Upload failed: ${error.message}`));
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                  url: downloadURL,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  path: filePath
                });
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      } else {
        // Simple upload without progress
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return {
          url: downloadURL,
          name: file.name,
          size: file.size,
          type: file.type,
          path: filePath
        };
      }
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  // Check if file is an image
  isImage(fileType: string): boolean {
    return fileType.startsWith('image/');
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon based on type
  getFileIcon(fileType: string): string {
    if (this.isImage(fileType)) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('document') || fileType.includes('word')) return '📝';
    if (fileType.includes('text')) return '📋';
    return '📎';
  }
}

export const fileUploadService = new FileUploadService();
