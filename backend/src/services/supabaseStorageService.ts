import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = 'https://ihutcfdccgndpjxvkuwu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodXRjZmRjY2duZHBqeHZrdXd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg0Mjg2NiwiZXhwIjoyMDY1NDE4ODY2fQ.nd4kmIcracuRELJrxCOJQB_pu-AanJJ9QsPkrWTvb7Q';

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

class SupabaseStorageService {
  private bucketName = 'slack-files';

  constructor() {
    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      // Check if bucket exists, if not create it
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('❌ Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        console.log('📦 Creating Supabase storage bucket:', this.bucketName);
        const { data, error } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ],
          fileSizeLimit: 5242880 // 5MB
        });

        if (error) {
          console.error('❌ Error creating bucket:', error);
        } else {
          console.log('✅ Supabase storage bucket created successfully:', data);
        }
      } else {
        console.log('✅ Supabase storage bucket already exists:', this.bucketName);
      }
    } catch (error) {
      console.error('❌ Error initializing Supabase storage:', error);
    }
  }

  async uploadFile(file: Buffer, fileName: string, contentType: string): Promise<{ url: string; path: string }> {
    try {
      // Generate unique filename
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `uploads/${uniqueFileName}`;

      console.log('📤 Uploading file to Supabase:', fileName, 'as', uniqueFileName);

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          contentType,
          duplex: 'half'
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      console.log('✅ File uploaded successfully to Supabase:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('🔗 Public URL generated:', publicUrl);

      return {
        url: publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('❌ Error uploading file to Supabase:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      console.log('🗑️ Deleting file from Supabase:', filePath);

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Supabase delete error:', error);
        throw new Error(`Supabase delete failed: ${error.message}`);
      }

      console.log('✅ File deleted successfully from Supabase');
    } catch (error) {
      console.error('❌ Error deleting file from Supabase:', error);
      throw error;
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    try {
      const { data } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('❌ Error getting file URL from Supabase:', error);
      throw error;
    }
  }
}

export const supabaseStorageService = new SupabaseStorageService();
export default SupabaseStorageService;
