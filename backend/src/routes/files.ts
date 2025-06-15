import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

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

    const fileUrl = `/api/files/${req.file.filename}`;
    
    const result = {
      file: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        path: req.file.path
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

    const uploadedFiles = files.map(file => ({
      url: `/api/files/${file.filename}`,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      path: file.path
    }));

    res.json({ files: uploadedFiles });
  } catch (error) {
    console.error('Multiple files upload error:', error);
    res.status(500).json({ error: 'Files upload failed' });
  }
});

// Serve uploaded files
router.get('/:filename', (req, res): void => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  
  // Set appropriate headers
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);
  
  // Send file
  res.sendFile(filePath);
});

export default router;
