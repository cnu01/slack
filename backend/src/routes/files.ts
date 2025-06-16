import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { supabaseStorageService } from '../services/supabaseStorageService';

const router = express.Router();

// Configure multer for memory storage (since we're uploading to cloud)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = [
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
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

// Upload single file
router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthRequest, res): Promise<void> => {
  try {
    console.log('📎 File upload request received');
    console.log('📎 User:', req.user?.userId);
    console.log('📎 File:', req.file?.originalname);
    
    if (!req.file) {
      console.log('❌ No file in request');
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Upload to Supabase Storage
    console.log('🔄 Uploading to Supabase Storage...');
    const uploadResult = await supabaseStorageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    
    const result = {
      file: {
        url: uploadResult.url,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        path: uploadResult.path
      }
    };
    
    console.log('✅ File upload successful:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Upload multiple files
router.post('/upload-multiple', authenticateToken, upload.array('files', 5), async (req: AuthRequest, res): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    console.log(`🔄 Uploading ${files.length} files to Supabase Storage...`);
    
    // Upload all files to Supabase Storage
    const uploadPromises = files.map(async (file) => {
      const uploadResult = await supabaseStorageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );
      
      return {
        url: uploadResult.url,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        path: uploadResult.path
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    console.log('✅ All files uploaded successfully');

    res.json({ files: uploadedFiles });
  } catch (error) {
    console.error('Multiple files upload error:', error);
    res.status(500).json({ error: 'Files upload failed' });
  }
});

// Delete file from cloud storage
router.delete('/:fileUrl', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const fileUrl = decodeURIComponent(req.params.fileUrl);
    console.log('🗑️ Deleting file from Supabase Storage:', fileUrl);
    
    await supabaseStorageService.deleteFile(fileUrl);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('❌ File deletion error:', error);
    res.status(500).json({ error: 'File deletion failed' });
  }
});

export default router;
