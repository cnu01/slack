const API_BASE_URL = 'http://localhost:5001/api';

export interface AvatarUploadResult {
  avatarUrl: string;
  success: boolean;
  message?: string;
}

export class BackendAvatarService {
  private static getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  static async uploadAvatar(file: File): Promise<AvatarUploadResult> {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed for avatars');
      }

      if (file.size > 2 * 1024 * 1024) { // 2MB limit for avatars
        throw new Error('Avatar file size must be less than 2MB');
      }

      console.log('🖼️ Uploading avatar to backend:', file.name);
      
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload avatar';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Could not parse error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Avatar uploaded successfully:', data);

      return {
        avatarUrl: data.avatarUrl || data.avatar,
        success: true
      };
    } catch (error) {
      console.error('❌ Avatar upload failed:', error);
      return {
        avatarUrl: '',
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  static async deleteAvatar(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete avatar');
      }

      console.log('✅ Avatar deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Avatar deletion failed:', error);
      return false;
    }
  }
}
