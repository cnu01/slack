import React, { useState, useRef } from 'react';
import { X, Upload, File, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { fileUploadService } from '../lib/fileUploadService';
import type { FileUploadProgress, UploadedFile } from '../lib/fileUploadService';

interface FileUploadComponentProps {
  workspaceId: string;
  channelId: string;
  onFileUploaded: (file: UploadedFile) => void;
  onClose: () => void;
}

interface FilePreview {
  file: File;
  preview?: string;
  isValid: boolean;
  error?: string;
}

function FileUploadComponent({ onFileUploaded, onClose }: FileUploadComponentProps) {
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const filePreviews: FilePreview[] = files.map(file => {
      const isValid = fileUploadService.validateFileSize(file) && fileUploadService.validateFileType(file);
      let error = '';
      
      if (!fileUploadService.validateFileSize(file)) {
        error = `File too large (${fileUploadService.formatFileSize(file.size)}). Max 5MB allowed.`;
      } else if (!fileUploadService.validateFileType(file)) {
        error = 'File type not supported';
      }

      const filePreview: FilePreview = {
        file,
        isValid,
        error
      };

      // Create preview for images
      if (fileUploadService.isImage(file.type) && isValid) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedFiles(prev => 
            prev.map(fp => 
              fp.file === file 
                ? { ...fp, preview: e.target?.result as string }
                : fp
            )
          );
        };
        reader.readAsDataURL(file);
      }

      return filePreview;
    });

    setSelectedFiles(prev => [...prev, ...filePreviews]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const filePreviews: FilePreview[] = files.map(file => {
      const isValid = fileUploadService.validateFileSize(file) && fileUploadService.validateFileType(file);
      let error = '';
      
      if (!fileUploadService.validateFileSize(file)) {
        error = `File too large (${fileUploadService.formatFileSize(file.size)}). Max 5MB allowed.`;
      } else if (!fileUploadService.validateFileType(file)) {
        error = 'File type not supported';
      }

      const filePreview: FilePreview = {
        file,
        isValid,
        error
      };

      // Create preview for images
      if (fileUploadService.isImage(file.type) && isValid) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setSelectedFiles(prev => 
            prev.map(fp => 
              fp.file === file 
                ? { ...fp, preview: e.target?.result as string }
                : fp
            )
          );
        };
        reader.readAsDataURL(file);
      }

      return filePreview;
    });

    setSelectedFiles(prev => [...prev, ...filePreviews]);
  };

  const removeFile = (fileToRemove: File) => {
    setSelectedFiles(prev => prev.filter(fp => fp.file !== fileToRemove));
  };

  const handleUpload = async () => {
    const validFiles = selectedFiles.filter(fp => fp.isValid);
    if (validFiles.length === 0) return;

    setUploading(true);

    try {
      for (const filePreview of validFiles) {
        const file = filePreview.file;
        
        // Mock upload progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        }
        
        // Create mock uploaded file
        const mockUploadedFile: UploadedFile = {
          url: `mock-url-${Date.now()}-${file.name}`,
          name: file.name,
          size: file.size,
          type: file.type,
          path: `mock-path/${file.name}`
        };
        
        onFileUploaded(mockUploadedFile);
      }
      
      // Clear files and close
      setSelectedFiles([]);
      setUploadProgress({});
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const validFilesCount = selectedFiles.filter(fp => fp.isValid).length;

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Upload Files</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded"
          disabled={uploading}
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* File Input Area */}
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-gray-500">
          Images, PDFs, Documents (Max 5MB each)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
      </div>

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
          {selectedFiles.map((filePreview, index) => (
            <div 
              key={index}
              className={`flex items-center space-x-3 p-3 rounded-lg border ${
                filePreview.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              {/* File Icon/Preview */}
              <div className="flex-shrink-0">
                {filePreview.preview ? (
                  <img 
                    src={filePreview.preview} 
                    alt={filePreview.file.name}
                    className="w-12 h-12 object-cover rounded border"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    {fileUploadService.isImage(filePreview.file.type) ? (
                      <Image className="w-6 h-6 text-gray-500" />
                    ) : (
                      <File className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {filePreview.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {fileUploadService.formatFileSize(filePreview.file.size)}
                </p>
                {filePreview.error && (
                  <p className="text-xs text-red-600 mt-1">{filePreview.error}</p>
                )}
                
                {/* Upload Progress */}
                {uploading && uploadProgress[filePreview.file.name] !== undefined && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[filePreview.file.name]}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(uploadProgress[filePreview.file.name])}%
                    </p>
                  </div>
                )}
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {filePreview.isValid ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              {/* Remove Button */}
              {!uploading && (
                <button
                  onClick={() => removeFile(filePreview.file)}
                  className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {validFilesCount > 0 && (
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || validFilesCount === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : `Upload ${validFilesCount} file${validFilesCount > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}

export default FileUploadComponent;
