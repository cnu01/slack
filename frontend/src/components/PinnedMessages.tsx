import React, { useState, useEffect } from 'react';
import { Pin } from 'lucide-react';
import { apiClient } from '../lib/api';

interface PinnedMessagesProps {
  channelId: string;
}

const PinnedMessages: React.FC<PinnedMessagesProps> = ({ channelId }) => {
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPinned, setShowPinned] = useState(false);

  useEffect(() => {
    if (showPinned) {
      loadPinnedMessages();
    }
  }, [showPinned, channelId]);

  const loadPinnedMessages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPinnedMessages(channelId);
      setPinnedMessages(response.pinnedMessages || []);
    } catch (error) {
      console.error('Failed to load pinned messages:', error);
    } finally {
      setLoading(false);
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

  if (pinnedMessages.length === 0 && !showPinned) {
    return null;
  }

  return (
    <div className="border-b border-gray-200">
      {/* Toggle Button */}
      <button
        onClick={() => setShowPinned(!showPinned)}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Pin className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {pinnedMessages.length} pinned {pinnedMessages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {showPinned ? 'Hide' : 'Show'}
        </div>
      </button>

      {/* Pinned Messages List */}
      {showPinned && (
        <div className="bg-gray-50 border-t border-gray-200">
          {loading ? (
            <div className="p-4 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No pinned messages in this channel
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {pinnedMessages.map((message) => (
                <div key={message._id} className="p-3 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {message.author?.avatar ? (
                        <img
                          src={message.author.avatar}
                          alt={message.author.username}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {getInitials(message.author?.username || 'U')}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-xs">{message.author?.username}</span>
                        <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
                        <Pin className="h-3 w-3 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-900 mt-1 line-clamp-2">{message.content}</p>
                      {message.pinnedBy && (
                        <div className="text-xs text-gray-500 mt-1">
                          Pinned by {message.pinnedBy.username}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PinnedMessages;
