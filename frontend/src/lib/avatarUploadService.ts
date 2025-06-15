import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export interface AvatarUploadResult {
  url: string;
  path: string;
}

export class AvatarUploadService {
  /**
   * Upload avatar to Firebase Storage
   * @param file - The image file to upload
   * @param userId - User ID to create unique path
   * @returns Promise with download URL and storage path
   */
  static async uploadAvatar(file: File, userId: string): Promise<AvatarUploadResult> {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }

      // Check file size (5MB limit)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_SIZE) {
        throw new Error('File size must be less than 5MB');
      }

      // Create unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `avatar_${timestamp}.${fileExtension}`;
      const storagePath = `avatars/${userId}/${fileName}`;

      // Create storage reference
      const storageRef = ref(storage, storagePath);

      // Upload file
      console.log('📤 Uploading avatar to Firebase:', storagePath);
      const snapshot = await uploadBytes(storageRef, file);
      console.log('✅ Avatar uploaded successfully');

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('🔗 Avatar URL:', downloadURL);

      return {
        url: downloadURL,
        path: storagePath
      };
    } catch (error) {
      console.error('❌ Avatar upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete avatar from Firebase Storage
   * @param path - Storage path of the avatar to delete
   */
  static async deleteAvatar(path: string): Promise<void> {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      console.log('🗑️ Avatar deleted successfully:', path);
    } catch (error) {
      console.error('❌ Avatar deletion failed:', error);
      // Don't throw here - deletion failure shouldn't block the update
    }
  }

  /**
   * Resize image before upload (optional - for better performance)
   * @param file - Original image file
   * @param maxWidth - Maximum width in pixels
   * @param maxHeight - Maximum height in pixels
   * @param quality - JPEG quality (0-1)
   * @returns Promise with resized file
   */
  static async resizeImage(
    file: File, 
    maxWidth: number = 200, 
    maxHeight: number = 200, 
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        const aspectRatio = width / height;

        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw and resize image
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
}
