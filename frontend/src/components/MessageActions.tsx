import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAppStore } from '../store/appStore';

interface Reaction {
  emoji: string;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onReactionUpdate: (reactions: Reaction[]) => void;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  onReactionUpdate
}) => {
  const { user } = useAppStore();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Common emojis for quick access
  const commonEmojis = ['👍', '👎', '❤️', '😂', '😮', '😢', '🔥', '👏', '✅', '❌'];

  const handleReactionClick = async (emoji: string) => {
    if (!user) return;

    try {
      const existingReaction = reactions.find(r => r.emoji === emoji);
      const userHasReacted = existingReaction?.users.includes(user._id);

      if (userHasReacted) {
        // Remove reaction
        await apiClient.removeReaction(messageId, emoji);
        const updatedReactions = reactions.map(r => {
          if (r.emoji === emoji) {
            const newUsers = r.users.filter(userId => userId !== user._id);
            return newUsers.length > 0 ? { ...r, users: newUsers } : null;
          }
          return r;
        }).filter(Boolean) as Reaction[];
        
        onReactionUpdate(updatedReactions);
      } else {
        // Add reaction
        await apiClient.addReaction(messageId, emoji);
        let updatedReactions;
        
        if (existingReaction) {
          updatedReactions = reactions.map(r => 
            r.emoji === emoji 
              ? { ...r, users: [...r.users, user._id] }
              : r
          );
        } else {
          updatedReactions = [...reactions, { emoji, users: [user._id] }];
        }
        
        onReactionUpdate(updatedReactions);
      }
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
    
    setShowEmojiPicker(false);
  };

  const getReactionTooltip = (reaction: Reaction) => {
    if (reaction.users.length === 1) {
      return `1 person reacted with ${reaction.emoji}`;
    }
    return `${reaction.users.length} people reacted with ${reaction.emoji}`;
  };

  if (reactions.length === 0 && !showEmojiPicker) {
    return (
      <div className="flex items-center mt-1">
        <button
          onClick={() => setShowEmojiPicker(true)}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Smile className="h-3 w-3" />
          <span>Add reaction</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center flex-wrap gap-1 mt-2">
      {/* Existing reactions */}
      {reactions.map((reaction) => {
        const userHasReacted = user ? reaction.users.includes(user._id) : false;
        
        return (
          <button
            key={reaction.emoji}
            onClick={() => handleReactionClick(reaction.emoji)}
            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded-md border transition-colors ${
              userHasReacted
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
            }`}
            title={getReactionTooltip(reaction)}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.users.length}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative" ref={emojiPickerRef}>
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="flex items-center justify-center w-7 h-7 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Smile className="h-3 w-3" />
        </button>

        {/* Simple emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 min-w-max">
            <div className="grid grid-cols-5 gap-1">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageReactions;
