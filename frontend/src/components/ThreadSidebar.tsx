import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Hash, Paperclip, Smile, AtSign, FileText } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { apiClient } from '../lib/api';
import { useAppStore } from '../store/appStore';
import { MessageRenderer } from './MessageRenderer';
import { parseMentions } from '../utils/mentionUtils';
import type { UploadedFile } from '../lib/backendFileUploadService';
import { backendFileUploadService } from '../lib/backendFileUploadService';
import UnifiedInput from './UnifiedInput';
import ThreadSummaryGenerator from './ThreadSummaryGenerator';

interface ThreadSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: any;
  autoReply?: string;
  onAutoReplyUsed?: () => void;
}

interface ThreadReply {
  _id: string;
  content: string;
  mentions?: Array<{
    type: 'user' | 'channel' | 'everyone';
    targetId?: string;
    displayText: string;
  }>;
  author: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
}

const ThreadSidebar: React.FC<ThreadSidebarProps> = ({ isOpen, onClose, parentMessage, autoReply, onAutoReplyUsed }) => {
  const { user, currentChannel, currentWorkspace: _currentWorkspace, workspaceUsers } = useAppStore();
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [fileUploads, setFileUploads] = useState<UploadedFile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showThreadSummary, setShowThreadSummary] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && parentMessage) {
      loadThreadReplies();
    }
  }, [isOpen, parentMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Handle auto-reply from parent
  useEffect(() => {
    if (autoReply && autoReply.trim()) {
      setNewReply(autoReply);
      onAutoReplyUsed?.();
    }
  }, [autoReply, onAutoReplyUsed]);

  const scrollToBottom = () => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadThreadReplies = async () => {
    if (!parentMessage) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getThreadReplies(parentMessage._id);
      setReplies(response.replies || []);
    } catch (error) {
      console.error('Failed to load thread replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReply.trim() && fileUploads.length === 0 || !parentMessage || !user) return;

    try {
      setSending(true);
      
      // Send text reply if there's content
      if (newReply.trim()) {
        // Parse mentions from the reply
        const mentions = parseMentions(newReply.trim(), workspaceUsers, !!currentChannel);
        console.log('📝 Parsed thread reply mentions:', mentions);
        
        const response = await apiClient.createThreadReply(parentMessage._id, newReply.trim(), mentions);
        
        // Add the new reply to the list
        setReplies(prev => [...prev, response.reply]);
      }
      
      // Send file replies for each uploaded file
      for (const file of fileUploads) {
        console.log('🚀 Sending thread file reply:', file.name);
        const fileMessage = `📎 Uploaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
        const response = await apiClient.createThreadReply(parentMessage._id, fileMessage, []);
        setReplies(prev => [...prev, response.reply]);
      }
      
      // Clear inputs
      setNewReply('');
      setFileUploads([]);
    } catch (error) {
      console.error('Failed to send thread reply:', error);
      alert('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!parentMessage || !user || !currentChannel) return;

    try {
      setSending(true);
      
      for (const file of Array.from(files)) {
        console.log('🔄 Uploading thread file:', file.name);
        const uploadedFile = await backendFileUploadService.uploadFile(file);
        console.log('✅ Thread file uploaded successfully:', uploadedFile);
        setFileUploads(prev => [...prev, uploadedFile]);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleEmojiSelect = (emojiData: any) => {
    const emoji = emojiData.emoji;
    setNewReply(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 bg-white border-l flex flex-col h-full" style={{ borderColor: '#E1E1E1' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white" style={{ borderColor: '#E1E1E1' }}>
        <div className="flex items-center space-x-2">
          <Hash className="h-4 w-4 text-gray-500" />
          <span className="font-semibold text-sm" style={{ color: '#1D1C1D' }}>Thread</span>
          {currentChannel && (
            <span className="text-xs" style={{ color: '#616061' }}>in #{currentChannel.name}</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowThreadSummary(true)}
            className="flex items-center space-x-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
            title="Generate thread summary"
          >
            <FileText className="h-3 w-3" />
            <span>Summary</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Parent Message */}
      {parentMessage && (
        <div className="flex-shrink-0 px-4 py-3 border-b max-h-100 overflow-y-auto" style={{ borderColor: '#E1E1E1', backgroundColor: '#F8F8F8' }}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {parentMessage.author?.avatar ? (
                <img
                  src={parentMessage.author.avatar}
                  alt={parentMessage.author.username}
                  className="h-8 w-8 rounded-lg object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                     style={{ backgroundColor: `hsl(${parentMessage.author?.username?.charCodeAt(0) * 137.5 % 360 || 0}, 70%, 50%)` }}>
                  {getInitials(parentMessage.author?.username || 'U')}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm" style={{ color: '#1D1C1D' }}>{parentMessage.author?.username}</span>
                <span className="text-xs" style={{ color: '#616061' }}>{formatTime(parentMessage.createdAt)}</span>
              </div>
              <div className="text-sm mt-1 break-words whitespace-pre-wrap" style={{ color: '#1D1C1D' }}>
                <MessageRenderer 
                  content={parentMessage.content}
                  mentions={parentMessage.mentions || []}
                  users={workspaceUsers}
                  isChannel={!!currentChannel}
                />
              </div>
              <div className="text-xs mt-2" style={{ color: '#616061' }}>
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thread Replies */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#007a5a' }}></div>
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center mt-8" style={{ color: '#616061' }}>
            <p>No replies yet.</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          replies.map((reply) => (
            <div key={reply._id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {reply.author?.avatar ? (
                  <img
                    src={reply.author.avatar}
                    alt={reply.author.username}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                       style={{ backgroundColor: `hsl(${reply.author?.username?.charCodeAt(0) * 137.5 % 360 || 0}, 70%, 50%)` }}>
                    {getInitials(reply.author?.username || 'U')}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm" style={{ color: '#1D1C1D' }}>{reply.author?.username}</span>
                  <span className="text-xs" style={{ color: '#616061' }}>{formatTime(reply.createdAt)}</span>
                  {reply.isEdited && (
                    <span className="text-xs" style={{ color: '#616061' }}>(edited)</span>
                  )}
                </div>
                <div className="text-sm mt-1 break-words whitespace-pre-wrap" style={{ color: '#1D1C1D' }}>
                  <MessageRenderer 
                    content={reply.content}
                    mentions={reply.mentions || []}
                    users={workspaceUsers}
                    isChannel={!!currentChannel}
                  />
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={repliesEndRef} />
      </div>

      {/* Reply Input */}
      <div className="flex-shrink-0 border-t bg-white" style={{ borderColor: '#E1E1E1' }}>
        <form onSubmit={handleSendReply} className="relative">
          {/* Input Row */}
          <div className="flex items-center px-4 py-3 space-x-3">
            <UnifiedInput
              value={newReply}
              onChange={setNewReply}
              onSubmit={handleSendReply}
              placeholder="Reply to thread..."
              disabled={sending}
              className="flex-1"
            >
              {/* Left side actions */}
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Upload file"
                onClick={() => document.getElementById('thread-file-upload-input')?.click()}
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                id="thread-file-upload-input"
                type="file"
                multiple
                accept="image/*,video/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files);
                  }
                }}
              />
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Mention someone"
              >
                <AtSign className="w-4 h-4" />
              </button>
            </UnifiedInput>
            
            {/* Right side actions */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Add emoji"
                onClick={() => setShowEmojiPicker(prev => !prev)}
              >
                <Smile className="w-4 h-4" />
              </button>
              
              {/* Send Button */}
              <button
                type="submit"
                disabled={!newReply.trim() || sending}
                className={`flex items-center justify-center w-9 h-9 rounded-md transition-all ${
                  !newReply.trim() || sending
                    ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                    : 'text-white bg-[#007a5a] hover:bg-[#006644] shadow-sm hover:shadow-md'
                }`}
                title="Send reply"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-full right-4 mb-2 z-30">
              <div ref={emojiPickerRef} className="bg-white border border-gray-200 rounded-lg shadow-lg">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  height={320}
                  width={350}
                  searchDisabled
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            </div>
          )}

          {/* File Previews */}
          {fileUploads.length > 0 && (
            <div className="px-4 py-3 border-t" style={{ borderColor: '#E1E1E1' }}>
              <div className="text-sm mb-2" style={{ color: '#1D1C1D' }}>
                Files to be uploaded:
              </div>
              <div className="space-y-2">
                {fileUploads.map((file, index) => (
                  <div key={file.url} className="flex items-center space-x-3 bg-gray-50 rounded-md p-2.5">
                    {/* File preview/icon */}
                    <div className="flex items-center justify-center w-10 h-10 bg-white rounded-md border border-gray-200 overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={file.url} 
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                            const icon = document.createElement('div');
                            icon.innerHTML = '🖼️';
                            icon.className = 'text-lg';
                            (e.target as HTMLImageElement).parentNode?.appendChild(icon);
                          }}
                        />
                      ) : (
                        <div className="text-lg">
                          {file.type === 'application/pdf' ? '📄' :
                           file.type.includes('document') || file.type.includes('word') ? '📝' :
                           file.type.includes('text') ? '📋' :
                           '📎'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)}MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFileUploads(prev => prev.filter((_, i) => i !== index))}
                      className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Thread Summary Generator */}
      {showThreadSummary && parentMessage && currentChannel && (
        <ThreadSummaryGenerator
          messageId={parentMessage._id}
          channelName={currentChannel.name}
          parentMessage={parentMessage}
          onClose={() => setShowThreadSummary(false)}
        />
      )}
    </div>
  );
};

export default ThreadSidebar;
