import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Hash, Paperclip, Smile, AtSign } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAppStore } from '../store/appStore';
import { MessageRenderer } from './MessageRenderer';
import { parseMentions } from '../utils/mentionUtils';

interface ThreadSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: any;
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

const ThreadSidebar: React.FC<ThreadSidebarProps> = ({ isOpen, onClose, parentMessage }) => {
  const { user, currentChannel, workspaceUsers } = useAppStore();
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && parentMessage) {
      loadThreadReplies();
    }
  }, [isOpen, parentMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

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
    
    if (!newReply.trim() || !parentMessage || !user) return;

    try {
      setSending(true);
      
      // Parse mentions from the reply
      const mentions = parseMentions(newReply.trim(), workspaceUsers, !!currentChannel);
      console.log('📝 Parsed thread reply mentions:', mentions);
      
      const response = await apiClient.createThreadReply(parentMessage._id, newReply.trim(), mentions);
      
      // Add the new reply to the list
      setReplies(prev => [...prev, response.reply]);
      setNewReply('');
    } catch (error) {
      console.error('Failed to send thread reply:', error);
      alert('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
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
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Parent Message */}
      {parentMessage && (
        <div className="px-4 py-3 border-b" style={{ borderColor: '#E1E1E1', backgroundColor: '#F8F8F8' }}>
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
              <div className="text-sm mt-1" style={{ color: '#1D1C1D' }}>
                <MessageRenderer 
                  content={parentMessage.content}
                  mentions={parentMessage.mentions}
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
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
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
                <div className="text-sm mt-1" style={{ color: '#1D1C1D' }}>
                  <MessageRenderer 
                    content={reply.content}
                    mentions={reply.mentions}
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
      <div className="border-t bg-white" style={{ borderColor: '#E1E1E1' }}>
        <form onSubmit={handleSendReply} className="flex flex-col">
          {/* Input Row */}
          <div className="flex items-end px-4 py-3">
            {/* Left Actions */}
            <div className="flex items-center space-x-1 mr-2">
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Upload file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Mention someone"
              >
                <AtSign className="w-4 h-4" />
              </button>
            </div>

            {/* Text Input */}
            <div className="flex-1 relative bg-white border rounded-lg focus-within:ring-1 focus-within:ring-blue-500" style={{ borderColor: '#D1D5DB' }}>
              <textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder={`Reply to thread...`}
                className="w-full px-3 py-2 border-0 resize-none focus:ring-0 focus:outline-none text-sm placeholder-gray-500 leading-5 rounded-lg"
                rows={1}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply(e);
                  }
                }}
                style={{
                  minHeight: '2.25rem',
                  maxHeight: '120px',
                }}
              />
            </div>
            
            {/* Right Actions & Send Button */}
            <div className="flex items-center space-x-1 ml-2">
              {/* Formatting Actions */}
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              
              {/* Send Button */}
              <button
                type="submit"
                disabled={!newReply.trim() || sending}
                className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
                  !newReply.trim() || sending
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-white bg-[#007a5a] hover:bg-[#006644] shadow-sm'
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
        </form>
      </div>
    </div>
  );
};

export default ThreadSidebar;
