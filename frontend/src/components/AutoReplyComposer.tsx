import React, { useState } from 'react';
import { Sparkles, Edit3, Send } from 'lucide-react';
import { aiService } from '../lib/aiService';

interface AutoReplyComposerProps {
  messageContent: string;
  channelContext?: string;
  onSelectReply: (reply: string) => void;
  className?: string;
}

const AutoReplyComposer: React.FC<AutoReplyComposerProps> = ({
  messageContent,
  channelContext,
  onSelectReply,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedSuggestion, setEditedSuggestion] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const generateSuggestions = async () => {
    if (!messageContent.trim()) return;

    console.log('Generating suggestions for:', messageContent);
    setIsGenerating(true);
    try {
      const newSuggestions = await aiService.generateAutoReply(
        messageContent, 
        channelContext
      );
      console.log('Generated suggestions:', newSuggestions);
      // Ensure we always have an array
      const validSuggestions = Array.isArray(newSuggestions) ? newSuggestions : [];
      setSuggestions(validSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      // Show fallback suggestions on error
      setSuggestions([
        "Thank you for the message.",
        "I'll look into this and get back to you.",
        "Got it, thanks for letting me know."
      ]);
      setShowSuggestions(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditSuggestion = (index: number) => {
    if (suggestions && suggestions[index]) {
      setEditingIndex(index);
      setEditedSuggestion(suggestions[index]);
    }
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editedSuggestion.trim() && suggestions) {
      const newSuggestions = [...suggestions];
      newSuggestions[editingIndex] = editedSuggestion.trim();
      setSuggestions(newSuggestions);
      setEditingIndex(null);
      setEditedSuggestion('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedSuggestion('');
  };

  const handleSelectReply = (reply: string) => {
    onSelectReply(reply);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className={`max-w-full ${className}`}>
      {/* Suggest Reply Button */}
      {!showSuggestions && (
        <button
          onClick={generateSuggestions}
          disabled={isGenerating || !messageContent.trim()}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 disabled:bg-gray-100 disabled:text-gray-400 border border-purple-200 rounded-lg transition-colors duration-200 shadow-sm"
        >
          {isGenerating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {isGenerating ? 'Generating...' : 'Generate AI Suggestions'}
        </button>
      )}

      {/* Suggestions Container */}
      {showSuggestions && suggestions && suggestions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-3 max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
              AI Reply Suggestions
            </h3>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1 rounded hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          {/* Suggestions List */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(suggestions || []).map((suggestion, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors duration-200 bg-gray-50 hover:bg-white"
              >
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedSuggestion}
                      onChange={(e) => setEditedSuggestion(e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      rows={2}
                      placeholder="Edit your reply..."
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 leading-relaxed">{suggestion}</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSelectReply(suggestion)}
                        className="inline-flex items-center px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors duration-200"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Use Reply
                      </button>
                      <button
                        onClick={() => handleEditSuggestion(index)}
                        className="inline-flex items-center px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors duration-200"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-gray-200">
            <button
              onClick={generateSuggestions}
              disabled={isGenerating}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium disabled:text-gray-400"
            >
              {isGenerating ? 'Generating...' : 'Generate more suggestions'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoReplyComposer;
