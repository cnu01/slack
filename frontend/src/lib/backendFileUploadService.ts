export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
  path: string;
}

export interface FileUploadProgress {
  progress: number;
  loaded: number;
  total: number;
}

class BackendFileUploadService {
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
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return supportedTypes.includes(file.type);
  }

  // Upload file to backend
  async uploadFile(
    file: File,
    _onProgress?: (progress: FileUploadProgress) => void
  ): Promise<UploadedFile> {
    // Validate file
    if (!this.validateFileSize(file)) {
      throw new Error(`File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    if (!this.validateFileType(file)) {
      throw new Error(`File type ${file.type} is not supported`);
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      console.log('📎 Starting file upload to backend:', file.name);
      console.log('📎 File size:', file.size, 'bytes');
      console.log('📎 File type:', file.type);

      const response = await fetch('http://localhost:5001/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('📎 Backend response status:', response.status);
      console.log('📎 Backend response headers:', response.headers);

      if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          console.log('📎 Backend error data:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use the status text
          console.log('📎 Could not parse error response:', e);
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📎 Backend success data:', data);
      return data.file;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  // Upload multiple files
  async uploadFiles(
    files: File[],
    _onProgress?: (progress: FileUploadProgress) => void
  ): Promise<UploadedFile[]> {
    // Validate all files first
    for (const file of files) {
      if (!this.validateFileSize(file)) {
        throw new Error(`File ${file.name} exceeds 5MB limit`);
      }
      if (!this.validateFileType(file)) {
        throw new Error(`File ${file.name} has unsupported type: ${file.type}`);
      }
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('http://localhost:5001/api/files/upload-multiple', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.files;
    } catch (error) {
      console.error('Files upload error:', error);
      throw error;
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

export const backendFileUploadService = new BackendFileUploadService();
