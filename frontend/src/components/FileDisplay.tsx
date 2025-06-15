import { Download, ExternalLink, File } from 'lucide-react';
import { backendFileUploadService } from '../lib/backendFileUploadService';
import type { UploadedFile } from '../lib/backendFileUploadService';

interface FileDisplayProps {
  file: UploadedFile;
  showDownloadButton?: boolean;
  compact?: boolean;
}

function FileDisplay({ file, showDownloadButton = true, compact = false }: FileDisplayProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = () => {
    window.open(file.url, '_blank');
  };

  if (compact) {
    return (
      <div className="inline-flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 text-sm">
        <span className="text-lg">{backendFileUploadService.getFileIcon(file.type)}</span>
        <span className="font-medium text-gray-700 truncate max-w-32">{file.name}</span>
        <button
          onClick={handleDownload}
          className="text-purple-600 hover:text-purple-700"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Image display
  if (backendFileUploadService.isImage(file.type)) {
    return (
      <div className="max-w-md">
        <div className="relative group">
          <img 
            src={file.url} 
            alt={file.name}
            className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-95 transition-opacity"
            onClick={handlePreview}
          />
          
          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex space-x-2">
              <button
                onClick={handlePreview}
                className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-2 rounded-full shadow-lg transition-all"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              {showDownloadButton && (
                <button
                  onClick={handleDownload}
                  className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-2 rounded-full shadow-lg transition-all"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* File info */}
        <div className="mt-2 text-xs text-gray-500">
          <p className="font-medium">{file.name}</p>
          <p>{backendFileUploadService.formatFileSize(file.size)}</p>
        </div>
      </div>
    );
  }

  // Non-image file display
  return (
    <div className="max-w-md border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-center space-x-3">
        {/* File Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            {file.type === 'application/pdf' ? (
              <span className="text-2xl">📄</span>
            ) : file.type.includes('document') || file.type.includes('word') ? (
              <span className="text-2xl">📝</span>
            ) : file.type.includes('text') ? (
              <span className="text-2xl">📋</span>
            ) : (
              <File className="w-6 h-6 text-purple-600" />
            )}
          </div>
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{backendFileUploadService.formatFileSize(file.size)}</p>
          
          {/* File type badge */}
          <span className="inline-block mt-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
            {file.type === 'application/pdf' ? 'PDF' :
             file.type.includes('document') ? 'DOC' :
             file.type.includes('text') ? 'TXT' :
             file.type.split('/')[1]?.toUpperCase() || 'FILE'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex space-x-1">
          <button
            onClick={handlePreview}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          {showDownloadButton && (
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileDisplay;
