import { useState } from 'react';

interface MessageReactionsProps {
  messageId: string;
  reactions?: { emoji: string; users: string[]; }[];
  onAddReaction: (messageId: string, emoji: string) => void;
}

const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉'];

function MessageReactions({ messageId, reactions = [], onAddReaction }: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onAddReaction(messageId, emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex items-center space-x-1 mt-1">
      {/* Existing Reactions */}
      {reactions.map((reaction, index) => (
        <button
          key={index}
          onClick={() => handleEmojiClick(reaction.emoji)}
          className="inline-flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full px-2 py-1 text-xs transition-colors"
        >
          <span>{reaction.emoji}</span>
          <span className="text-blue-600 font-medium">{reaction.users.length}</span>
        </button>
      ))}

      {/* Add Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full text-gray-500 hover:text-gray-700 transition-colors"
          title="Add reaction"
        >
          <span className="text-xs">😊</span>
        </button>

        {/* Simple Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-8 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
            <div className="grid grid-cols-4 gap-1">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
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
}

export default MessageReactions;
