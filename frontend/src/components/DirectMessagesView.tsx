import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, AtSign, Menu, User, Users } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../lib/api';
import { socketClient } from '../lib/socketClient';
import FileDisplay from './FileDisplay';
import MessageActions from './MessageActions';
import ThreadButton from './ThreadButton';
import ThreadSidebar from './ThreadSidebar';
import MessageMenu from './MessageMenu';
import { MessageRenderer } from './MessageRenderer';
import { parseMentions } from '../utils/mentionUtils';
import type { UploadedFile } from '../lib/fileUploadService';
import { fileUploadService } from '../lib/fileUploadService';

function DirectMessagesView() {
  const {
    currentDMUser,
    currentWorkspace,
    messages,
    setMessages,
    addMessage,
    workspaceUsers,
    toggleSidebar
  } = useAppStore();

  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showThreadSidebar, setShowThreadSidebar] = useState(false);
  const [selectedThreadMessage, setSelectedThreadMessage] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: any } | null>(null);
  
  // Mention functionality
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  
  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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

  // Load DM messages and setup real-time listeners
  useEffect(() => {
    if (!currentDMUser) return;

    const conversationId = `dm-${currentDMUser._id}`;
    console.log('🔄 Setting up DM conversation:', conversationId);

    // Setup socket listeners
    const unsubscribers: (() => void)[] = [];

    // Listen for new messages
    const unsubscribeMessage = socketClient.onMessage((message) => {
      console.log('📨 Received DM message:', message);
      if (message.channel === conversationId) {
        addMessage(message);
      }
    });

    // Listen for typing indicators
    const unsubscribeTyping = socketClient.onTyping((typing) => {
      console.log('⌨️ DM typing indicator:', typing);
      // Handle typing indicators for DMs if needed
    });

    unsubscribers.push(unsubscribeMessage, unsubscribeTyping);

    // Load existing DM messages
    const loadDMMessages = async () => {
      try {
        setLoading(true);
        console.log('📥 Loading DM messages for user:', currentDMUser._id);

        // Clear existing messages when switching DM conversations
        setMessages([]);

        // Join the DM conversation room for real-time updates
        socketClient.joinChannel(conversationId);

        // Load messages
        const response = await apiClient.getDMMessages(currentDMUser._id);
        console.log('✅ DM messages loaded:', response.messages);
        setMessages(response.messages);
      } catch (error) {
        console.error('❌ Failed to load DM messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDMMessages();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up DM conversation:', conversationId);
      unsubscribers.forEach(unsub => unsub());
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socketClient.leaveChannel(conversationId);
    };
  }, [currentDMUser, setMessages, addMessage]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDMUser || (!newMessage.trim() && uploadedFiles.length === 0) || sending) return;

    setSending(true);
    try {
      // Send text message first if there's content
      if (newMessage.trim()) {
        const mentions = parseMentions(newMessage.trim(), workspaceUsers, false); // DMs are not channels
        console.log('📝 Sending DM message with mentions:', mentions);
        const response = await apiClient.sendDMMessage(currentDMUser._id, newMessage.trim(), mentions);
        console.log('✅ DM message sent successfully:', response.message);
      }

      // Send file messages for each uploaded file
      for (const file of uploadedFiles) {
        console.log('🚀 Sending file DM message:', file.name);
        const fileMessage = `📎 Uploaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
        const response = await apiClient.sendDMMessage(currentDMUser._id, fileMessage, []);
        console.log('✅ File DM message sent successfully:', response.message);
      }

      // Clear inputs
      setNewMessage('');
      setUploadedFiles([]);
    } catch (error) {
      console.error('❌ Failed to send DM message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!currentDMUser) return;

    const conversationId = `dm-${currentDMUser._id}`;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Start typing indicator
    socketClient.startTyping(conversationId);

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      socketClient.stopTyping(conversationId);
    }, 2000);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    
    // Check for mention trigger
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionPosition(cursorPosition - mentionMatch[1].length - 1);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
    
    // Trigger typing indicator
    handleTyping();
  };

  const handleEmojiSelect = (emojiData: any) => {
    const emoji = emojiData.emoji;
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const insertMention = (username: string) => {
    const beforeMention = newMessage.substring(0, mentionPosition);
    const afterMention = newMessage.substring(mentionPosition + mentionQuery.length + 1);
    const newText = beforeMention + `@${username} ` + afterMention;
    
    setNewMessage(newText);
    setShowMentionDropdown(false);
    setMentionQuery('');
    
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const removeUploadedFile = (fileToRemove: UploadedFile) => {
    setUploadedFiles(prev => prev.filter(file => file.url !== fileToRemove.url));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && currentWorkspace && currentDMUser) {
      try {
        for (const file of Array.from(files)) {
          console.log('🔄 Uploading dropped file:', file.name);
          
          // Upload file to Firebase storage
          const uploadedFile = await fileUploadService.uploadFile(
            file, 
            currentWorkspace._id, 
            `dm-${currentDMUser._id}` // Use DM user ID as channel for DMs
          );
          
          console.log('✅ Dropped file uploaded successfully:', uploadedFile);
          setUploadedFiles(prev => [...prev, uploadedFile]);
        }
      } catch (error) {
        console.error('❌ Dropped file upload failed:', error);
        alert(`File upload failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && currentWorkspace && currentDMUser) {
      try {
        for (const file of files) {
          console.log('🔄 Uploading selected file:', file.name);
          
          // Upload file to Firebase storage
          const uploadedFile = await fileUploadService.uploadFile(
            file, 
            currentWorkspace._id, 
            `dm-${currentDMUser._id}` // Use DM user ID as channel for DMs
          );
          
          console.log('✅ Selected file uploaded successfully:', uploadedFile);
          setUploadedFiles(prev => [...prev, uploadedFile]);
        }
      } catch (error) {
        console.error('❌ Selected file upload failed:', error);
        alert(`File upload failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
      }
    }
    
    // Reset input value so same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleCloseThread = () => {
    setShowThreadSidebar(false);
    setSelectedThreadMessage(null);
  };

  const handleMessageContextMenu = (e: React.MouseEvent, message: any) => {
    e.preventDefault();
    // For now, disable message menu in DMs
    console.log('Message context menu:', message);
  };

  // Get mention suggestions
  const getMentionSuggestions = () => {
    const suggestions = [];
    
    // Add workspace users for DMs
    suggestions.push(...workspaceUsers);
    
    return suggestions;
  };

  const filteredMembers = getMentionSuggestions().filter(member =>
    member.username.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);

  if (!currentDMUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Select a conversation</h2>
          <p className="text-gray-500">Choose from your existing conversations, or start a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full">
      <div 
        className={`flex-1 flex flex-col bg-white h-full ${dragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* DM Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {currentDMUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{currentDMUser.username}</h2>
              <p className="text-sm text-gray-500">{currentDMUser.email}</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-gray-500">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  This is the beginning of your conversation with {currentDMUser.username}
                </h3>
                <p className="text-gray-500">Send a message to get started!</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div key={message._id} className="flex items-start space-x-3 group">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {message.author.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-900">{message.author.username}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <MessageRenderer content={message.content} users={workspaceUsers} />
                    
                    {/* File Display */}
                    {message.fileUrl && (
                      <FileDisplay
                        fileName={message.fileName || 'Unknown file'}
                        fileSize={message.fileSize || 0}
                        fileType={message.fileType || 'application/octet-stream'}
                        fileUrl={message.fileUrl}
                      />
                    )}
                    
                    {/* Message Actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                      <MessageActions
                        message={message}
                        reactions={message.reactions || []}
                        onReact={() => {}}
                        onReply={(parentMessage) => {
                          setSelectedThreadMessage(parentMessage);
                          setShowThreadSidebar(true);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* File Previews */}
        {uploadedFiles.length > 0 && (
          <div className="px-6 py-2 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="relative bg-white border border-gray-200 rounded-lg p-2 flex items-center space-x-2">
                  <FileDisplay
                    fileName={file.name}
                    fileSize={file.size}
                    fileType={file.type}
                    fileUrl={file.url}
                  />
                  <button
                    type="button"
                    onClick={() => removeUploadedFile(file)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="relative">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  placeholder={`Message ${currentDMUser.username}`}
                  className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 pr-20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  style={{
                    minHeight: '2.25rem',
                    maxHeight: '200px',
                  }}
                  disabled={sending}
                />
                
                {/* Mention Dropdown */}
                {showMentionDropdown && filteredMembers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-20 w-64">
                    {filteredMembers.map((member) => (
                      <button
                        key={member._id}
                        type="button"
                        onClick={() => insertMention(member.username)}
                        className="w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center space-x-2 border-b border-gray-100 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">@{member.username}</p>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Right Actions & Send Button */}
              <div className="flex items-center space-x-1">
                {/* File Upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                
                {/* Emoji Picker Button */}
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    title="Add emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 z-30">
                      <EmojiPicker
                        onEmojiClick={handleEmojiSelect}
                        width={300}
                        height={400}
                      />
                    </div>
                  )}
                </div>
                
                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && uploadedFiles.length === 0) || sending}
                  className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
                    (!newMessage.trim() && uploadedFiles.length === 0) || sending
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-white bg-[#007a5a] hover:bg-[#006644] shadow-sm'
                  }`}
                  title="Send message"
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
      </div>
      
      {/* Thread Sidebar */}
      {showThreadSidebar && (
        <ThreadSidebar
          isOpen={showThreadSidebar}
          onClose={handleCloseThread}
          parentMessage={selectedThreadMessage}
        />
      )}
    </div>
  );
}

export default DirectMessagesView;
