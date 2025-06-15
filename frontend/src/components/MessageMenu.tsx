import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, MessageSquare, Pin, PinOff, Edit, Trash2, Copy } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAppStore } from '../store/appStore';

interface MessageMenuProps {
  message: any;
  onThreadOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPinUpdate?: (isPinned: boolean) => void;
}

const MessageMenu: React.FC<MessageMenuProps> = ({
  message,
  onThreadOpen,
  onEdit,
  onDelete,
  onPinUpdate
}) => {
  const { user } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePinToggle = async () => {
    if (!message || loading) return;

    try {
      setLoading(true);
      
      if (message.isPinned) {
        await apiClient.unpinMessage(message._id);
        onPinUpdate?.(false);
      } else {
        await apiClient.pinMessage(message._id);
        onPinUpdate?.(true);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      alert('Failed to update pin status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsOpen(false);
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleThreadClick = () => {
    onThreadOpen();
    setIsOpen(false);
  };

  const handleEdit = () => {
    onEdit?.();
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDelete?.();
    }
    setIsOpen(false);
  };

  const canEdit = user && message.author._id === user._id;
  const canDelete = user && message.author._id === user._id; // For now, only message author can delete

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-md transition-all duration-200"
        title="More actions"
      >
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {/* Start thread */}
            <button
              onClick={handleThreadClick}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Reply in thread</span>
            </button>

            {/* Pin/Unpin */}
            <button
              onClick={handlePinToggle}
              disabled={loading}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {message.isPinned ? (
                <>
                  <PinOff className="h-4 w-4" />
                  <span>Unpin message</span>
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4" />
                  <span>Pin message</span>
                </>
              )}
            </button>

            {/* Copy text */}
            <button
              onClick={handleCopyText}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Copy className="h-4 w-4" />
              <span>Copy text</span>
            </button>

            {/* Divider */}
            {(canEdit || canDelete) && (
              <div className="border-t border-gray-200 my-1" />
            )}

            {/* Edit message */}
            {canEdit && onEdit && (
              <button
                onClick={handleEdit}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit message</span>
              </button>
            )}

            {/* Delete message */}
            {canDelete && onDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete message</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageMenu;
