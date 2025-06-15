import { useState, useEffect, useRef } from 'react';
import { Send, Hash, Lock, Users, Paperclip, Smile, AtSign, MessageSquare, Upload, Menu, FileText, Sparkles } from 'lucide-react';
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
import type { UploadedFile } from '../lib/backendFileUploadService';
import { backendFileUploadService } from '../lib/backendFileUploadService';
import ToneImpactMeter from './ToneImpactMeter';
import AutoReplyComposer from './AutoReplyComposer';
import MeetingNotesGenerator from './MeetingNotesGenerator';
import ErrorBoundary from './ErrorBoundary';

function MessagingArea() {  const { 
    currentChannel, 
    currentWorkspace,
    messages, 
    setMessages,
    addMessage,
    typingUsers,
    addTypingUser,
    removeTypingUser,
    toggleSidebar,
    workspaceUsers
  } = useAppStore();

  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Thread state
  const [showThreadSidebar, setShowThreadSidebar] = useState(false);
  const [selectedThreadMessage, setSelectedThreadMessage] = useState<any>(null);
  const [threadAutoReply, setThreadAutoReply] = useState<string>('');

  // Message tabs state
  const [activeTab, setActiveTab] = useState<'messages' | 'pinned'>('messages');
  const [pinnedItems, setPinnedItems] = useState<any[]>([]);
  const [loadingPinned, setLoadingPinned] = useState(false);

  // AI Features state
  const [showAutoReply, setShowAutoReply] = useState<string | null>(null); // Message ID for auto-reply
  const [showMeetingNotes, setShowMeetingNotes] = useState(false);
  const [autoReplySelectedMessage, setAutoReplySelectedMessage] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentChannel) {
      console.log('🔄 Channel changed to:', currentChannel.name);
      // Reset messages when switching channels
      setMessages([]);
      loadMessages();
    }
  }, [currentChannel?._id]); // Depend on channel ID, not the whole object

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up real-time message listening
  useEffect(() => {
    const unsubscribeMessage = socketClient.onMessage((message) => {
      console.log('📨 Received real-time message:', message);
      if (message.channel === currentChannel?._id) {
        console.log('✅ Adding message to current channel:', currentChannel?.name);
        addMessage(message);
      } else {
        console.log('🚫 Message not for current channel:', message.channel, 'vs', currentChannel?._id);
      }
    });

    const unsubscribeTyping = socketClient.onTyping((typing) => {
      if (currentChannel && typing.isTyping) {
        addTypingUser(currentChannel._id, typing.username);
        
        // Remove typing status after 3 seconds
        setTimeout(() => {
          removeTypingUser(currentChannel._id, typing.username);
        }, 3000);
      } else if (currentChannel) {
        removeTypingUser(currentChannel._id, typing.username);
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
    };
  }, [currentChannel, addMessage, addTypingUser, removeTypingUser]);

  // Join channel in socket when channel changes
  useEffect(() => {
    if (currentChannel) {
      socketClient.joinChannel(currentChannel._id);
      return () => {
        if (currentChannel) {
          socketClient.leaveChannel(currentChannel._id);
        }
      };
    }
  }, [currentChannel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!currentChannel) return;
    
    try {
      setLoading(true);
      console.log('🔄 Loading messages for channel:', currentChannel.name);
      const response = await apiClient.getMessages(currentChannel._id);
      console.log('📩 Loaded messages:', response.messages.length);
      setMessages(response.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load pinned messages
  const loadPinnedMessages = async () => {
    if (!currentChannel) return;
    
    try {
      setLoadingPinned(true);
      console.log('🔍 Loading pinned messages for channel:', currentChannel._id);
      const response = await apiClient.getPinnedMessages(currentChannel._id);
      console.log('📌 Pinned messages response:', response);
      
      // Handle different response formats
      let pinnedMessages = [];
      if (response.pinnedMessages) {
        // Backend returns { pinnedMessages: [...] }
        pinnedMessages = response.pinnedMessages;
      } else if (response.messages) {
        // Backend returns { messages: [...] }
        pinnedMessages = response.messages;
      } else if (Array.isArray(response)) {
        // Backend returns array directly
        pinnedMessages = response;
      }
      
      console.log('📌 Setting pinned items:', pinnedMessages.length, 'items');
      setPinnedItems(pinnedMessages);
    } catch (error) {
      console.error('Failed to load pinned messages:', error);
      setPinnedItems([]);
    } finally {
      setLoadingPinned(false);
    }
  };

  // Pin/Unpin message
  const handlePinMessage = async (messageId: string) => {
    try {
      console.log('📌 Pinning message:', messageId);
      await apiClient.pinMessage(messageId);
      console.log('✅ Message pinned successfully');
      // Refresh messages to update pin status
      loadMessages();
      // Refresh pinned items if we're on that tab
      if (activeTab === 'pinned') {
        console.log('🔄 Refreshing pinned items after pin');
        loadPinnedMessages();
      }
    } catch (error) {
      console.error('Failed to pin message:', error);
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      console.log('📌 Unpinning message:', messageId);
      await apiClient.unpinMessage(messageId);
      console.log('✅ Message unpinned successfully');
      // Refresh messages to update pin status
      loadMessages();
      // Refresh pinned items to remove from list
      if (activeTab === 'pinned') {
        console.log('🔄 Refreshing pinned items after unpin');
        loadPinnedMessages();
      }
    } catch (error) {
      console.error('Failed to unpin message:', error);
    }
  };

  // Load pinned messages when tab changes
  useEffect(() => {
    console.log('📋 Tab changed to:', activeTab, 'Current channel:', currentChannel?.name);
    if (activeTab === 'pinned' && currentChannel) {
      console.log('🔄 Loading pinned messages for tab switch');
      loadPinnedMessages();
    }
  }, [activeTab, currentChannel]);

  // AI Features handlers
  const handleAutoReply = (message: any) => {
    console.log('Auto-reply clicked for message:', message._id);
    console.log('Message content:', message.content);
    
    // Set the auto-reply state
    setAutoReplySelectedMessage(message);
    setShowAutoReply(message._id);
    
    // If this is not already a thread, open the thread for this message
    // This ensures auto-reply happens in thread context
    if (!showThreadSidebar || selectedThreadMessage?._id !== message._id) {
      console.log('Opening thread for auto-reply to message:', message._id);
      setSelectedThreadMessage(message);
      setShowThreadSidebar(true);
    }
  };

  const handleSelectAutoReply = (reply: string) => {
    console.log('Auto-reply selected:', reply);
    
    // Check if we have a thread open and an auto-reply message
    if (showThreadSidebar && selectedThreadMessage && autoReplySelectedMessage) {
      console.log('Sending auto-reply in thread context');
      // Don't set the main message input, instead we'll pass the reply to the thread
      // The ThreadSidebar component should handle this
      setShowAutoReply(null);
      setAutoReplySelectedMessage(null);
      
      // We need to communicate with ThreadSidebar to set the reply
      // For now, we'll use a custom event or state management
      // Let's add a state for thread reply
      setThreadAutoReply(reply);
    } else {
      // Normal behavior for main channel
      setNewMessage(reply);
      setShowAutoReply(null);
      setAutoReplySelectedMessage(null);
      // Focus the input
      textareaRef.current?.focus();
    }
  };

  const handleMeetingNotes = () => {
    setShowMeetingNotes(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChannel || (!newMessage.trim() && uploadedFiles.length === 0) || sending) return;

    try {
      setSending(true);
      
      // Stop typing indicator
      socketClient.stopTyping(currentChannel._id);
      
      // Send text message if there's content
      if (newMessage.trim()) {
        console.log('🚀 Sending text message to channel:', currentChannel._id);
        
        // Parse mentions from the message
        const mentions = parseMentions(newMessage.trim(), workspaceUsers, !!currentChannel);
        console.log('📝 Parsed mentions:', mentions);
        
        const response = await apiClient.sendMessage(currentChannel._id, newMessage.trim(), mentions);
        console.log('✅ Text message sent successfully:', response.message);
      }

      // Send file messages for each uploaded file
      for (const file of uploadedFiles) {
        console.log('🚀 Sending file message to channel:', currentChannel._id);
        
        // Send proper file message with file data using the existing sendMessage method
        const messageType = file.type.startsWith('image/') ? 'image' : 'file' as const;
        const fileData = {
          fileUrl: file.url,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        };
        
        console.log('📎 Sending file message data:', { messageType, fileData });
        const response = await apiClient.sendMessage(
          currentChannel._id, 
          '', // Empty content for file messages
          [], // No mentions for file messages
          messageType,
          fileData
        );
        console.log('✅ File message sent successfully:', response.message);
      }
      
      // Clear inputs
      setNewMessage('');
      setUploadedFiles([]);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!currentChannel) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Start typing indicator
    socketClient.startTyping(currentChannel._id);

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      socketClient.stopTyping(currentChannel._id);
    }, 2000);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    processDroppedFiles(files);
  };

  const processDroppedFiles = async (files: File[]) => {
    console.log('📎 Processing dropped files:', files.length);
    console.log('📎 Current workspace:', currentWorkspace?._id);
    console.log('📎 Current channel:', currentChannel?._id);
    
    if (!currentWorkspace || !currentChannel) {
      console.error('❌ Missing workspace or channel for file upload');
      alert('Please make sure you are in a workspace and channel before uploading files.');
      return;
    }
    
    const validFiles = files.filter(file => {
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      const isValidType = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ].includes(file.type);
      
      if (!isValidSize) {
        console.log(`❌ File ${file.name} is too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      }
      if (!isValidType) {
        console.log(`❌ File ${file.name} has unsupported type: ${file.type}`);
      }
      
      return isValidSize && isValidType;
    });

    console.log('📎 Valid files after filtering:', validFiles.length);

    // Upload files to backend and get real URLs
    for (const file of validFiles) {
      try {
        console.log('🔄 Uploading file to backend:', file.name);
        const uploadedFile = await backendFileUploadService.uploadFile(file);
        console.log('✅ File uploaded successfully:', uploadedFile);
        setUploadedFiles(prev => [...prev, uploadedFile]);
      } catch (error) {
        console.error('❌ Failed to upload file:', error);
        alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📎 File input change triggered');
    const files = Array.from(e.target.files || []);
    console.log('📎 Selected files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    if (files.length === 0) {
      console.log('📎 No files selected');
      return;
    }
    
    await processDroppedFiles(files);
    // Reset input value so same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  // Get mention suggestions including special mentions and workspace users
  const getMentionSuggestions = () => {
    const suggestions = [];
    
    // Add special mentions for channels
    if (currentChannel) {
      suggestions.push(
        { username: 'channel', isSpecial: true, type: 'channel', _id: 'special-channel' },
        { username: 'everyone', isSpecial: true, type: 'everyone', _id: 'special-everyone' }
      );
    }
    
    // Add workspace users
    suggestions.push(...workspaceUsers);
    
    return suggestions;
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setNewMessage(value);
    handleTyping();
    
    // Check for @ mentions
    const beforeCursor = value.substring(0, cursorPosition);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setShowMentionDropdown(true);
      setMentionQuery(mentionMatch[1]);
      setMentionPosition(cursorPosition - mentionMatch[0].length);
    } else {
      setShowMentionDropdown(false);
      setMentionQuery('');
    }
  };

  const insertMention = (username: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPosition = textarea.selectionStart;
    const textBefore = newMessage.substring(0, mentionPosition);
    const textAfter = newMessage.substring(cursorPosition);
    
    const newText = `${textBefore}@${username} ${textAfter}`;
    setNewMessage(newText);
    setShowMentionDropdown(false);
    setMentionQuery('');
    
    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPosition = mentionPosition + username.length + 2;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  const filteredMembers = getMentionSuggestions().filter((member: any) =>
    member.username.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleStartThread = (messageId: string) => {
    console.log('Starting thread for message:', messageId);
    
    // Find the message to start thread on
    const message = messages.find(m => m._id === messageId);
    if (!message) return;
    
    setSelectedThreadMessage(message);
    setShowThreadSidebar(true);
  };

  const handleCloseThread = () => {
    setShowThreadSidebar(false);
    setSelectedThreadMessage(null);
    setThreadAutoReply(''); // Clear any pending auto-reply
  };

  const handleQuickReaction = async (messageId: string, emoji: string = '👍') => {
    try {
      const response = await apiClient.addReaction(messageId, emoji);
      handleUpdateMessageReactions(messageId, response.reactions);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleUpdateMessageReactions = (messageId: string, reactions: any[]) => {
    setMessages(
      messages.map(message => 
        message._id === messageId 
          ? { ...message, reactions }
          : message
      )
    );
  };

  const handleUpdateMessagePin = (messageId: string, isPinned: boolean) => {
    console.log('📌 Updating message pin status:', messageId, 'isPinned:', isPinned);
    // Update the local message state
    setMessages(
      messages.map(message => 
        message._id === messageId 
          ? { ...message, isPinned, pinnedAt: isPinned ? new Date().toISOString() : undefined }
          : message
      )
    );
    
    // Always refresh pinned items when a pin status changes
    console.log('🔄 Refreshing pinned items after pin status change');
    loadPinnedMessages();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
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

  // Debug logging for pinned items
  useEffect(() => {
    console.log('🎨 Pinned items state changed:', pinnedItems.length, 'items:', pinnedItems);
  }, [pinnedItems]);

  if (!currentChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome to your workspace</h2>
          <p className="text-gray-500">Select a channel to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full relative">
      {/* Main Chat Area */}
      <div 
        className={`flex-1 flex flex-col h-full relative ${dragOver ? 'bg-blue-50' : 'bg-white'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-75 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Upload className="w-16 h-16 mx-auto mb-4" style={{ color: '#1264A3' }} />
            <p className="text-xl font-semibold mb-2" style={{ color: '#1264A3' }}>Drop files to upload</p>
            <p style={{ color: '#1264A3' }}>Images, PDFs, Documents (Max 5MB each)</p>
          </div>
        </div>
      )}
      
      {/* Channel Header */}
      <div className="border-b bg-white px-8 py-4 flex-shrink-0" style={{ borderColor: '#E1E1E1' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="p-1 mr-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            {currentChannel.isPrivate ? (
              <Lock className="w-5 h-5 mr-2" style={{ color: '#616061' }} />
            ) : (
              <Hash className="w-5 h-5 mr-2" style={{ color: '#616061' }} />
            )}
            <div>
              <h1 className="text-lg font-semibold" style={{ color: '#1D1C1D' }}>{currentChannel.name}</h1>
              {currentChannel.description && (
                <p className="text-sm" style={{ color: '#616061' }}>{currentChannel.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm" style={{ color: '#616061' }}>
              <Users className="w-4 h-4 mr-1" />
              {currentChannel.memberCount}
            </div>
            <button
              onClick={handleMeetingNotes}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
              title="Generate Meeting Notes"
            >
              <FileText className="w-4 h-4" />
              <span>Meeting Notes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('messages')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'messages'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Messages
              {messages.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                  {messages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('pinned')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pinned'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pinned Items
              {pinnedItems.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                  {pinnedItems.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-white min-h-0">
        {activeTab === 'messages' ? (
          // Messages Tab Content
          loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#F8F8F8' }}>
                  {currentChannel.isPrivate ? (
                    <Lock className="w-12 h-12" style={{ color: '#868686' }} />
                  ) : (
                    <Hash className="w-12 h-12" style={{ color: '#868686' }} />
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-4" style={{ color: '#1D1C1D' }}>
                  Welcome to #{currentChannel.name}
                </h3>
                <p className="max-w-md mx-auto" style={{ color: '#616061' }}>
                  This is the beginning of the #{currentChannel.name} channel.
                  {currentChannel.description && ` ${currentChannel.description}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-8 py-2">
              {messages.map((message: any, index: number) => {
              const showAvatar = index === 0 || messages[index - 1].author._id !== message.author._id;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const timeDiff = prevMessage ? new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() : 0;
              const showFullMessage = showAvatar || timeDiff > 5 * 60 * 1000; // 5 minutes
              
              return (
                <div 
                  key={message._id} 
                  className={`group hover:bg-gray-50 -mx-8 px-8 py-1 transition-colors relative ${showFullMessage ? 'mt-2' : ''}`}
                >
                  {/* Message Actions on Hover */}
                  <div className="absolute right-4 top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="flex items-center space-x-1 bg-white border border-gray-300 rounded-lg shadow-sm px-2 py-1">
                      <button
                        onClick={() => handleQuickReaction(message._id)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                        title="Add reaction"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAutoReply(message)}
                        className="p-1 hover:bg-gray-100 rounded text-purple-500 hover:text-purple-700"
                        title="Suggest Reply"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStartThread(message._id)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                        title="Reply in thread"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <MessageMenu
                        message={message}
                        onThreadOpen={() => handleStartThread(message._id)}
                        onPinUpdate={(isPinned) => handleUpdateMessagePin(message._id, isPinned)}
                      />
                    </div>
                  </div>

                  <div className="flex">
                    {showFullMessage ? (
                      /* Full message with avatar */
                      <div className="mr-2 mt-0.5 flex-shrink-0">
                        {message.author?.avatar ? (
                          <img
                            src={message.author.avatar}
                            alt={message.author.username}
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                               style={{ backgroundColor: `hsl(${message.author?.username?.charCodeAt(0) * 137.5 % 360 || 0}, 70%, 50%)` }}>
                            {message.author?.username?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Compact message with timestamp */
                      <div className="w-9 mr-2 flex justify-end pr-1 mt-0.5">
                        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#868686' }}>
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {showFullMessage && (
                        <div className="flex items-baseline space-x-2 mb-0.5">
                          <span className="font-bold text-sm" style={{ color: '#1D1C1D' }}>
                            {message.author.username}
                          </span>
                          <span className="text-xs" style={{ color: '#868686' }}>
                            {formatTime(message.createdAt)}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-sm leading-5 whitespace-pre-wrap break-words" style={{ color: '#1D1C1D' }}>
                        <MessageRenderer 
                          content={message.content}
                          mentions={message.mentions || []}
                          users={workspaceUsers}
                          isChannel={!!currentChannel}
                        />
                        {message.isEdited && (
                          <span className="text-xs ml-1" style={{ color: '#868686' }}>(edited)</span>
                        )}
                        
                        {/* File Display */}
                        {(message.messageType === 'file' || message.messageType === 'image') && message.fileUrl && (
                          <div className="mt-2">
                            <FileDisplay
                              file={{
                                url: message.fileUrl,
                                name: message.fileName || 'Unknown file',
                                size: message.fileSize || 0,
                                type: message.fileType || 'application/octet-stream',
                                path: message.fileUrl
                              }}
                              showDownloadButton={true}
                              compact={false}
                            />
                          </div>
                        )}
                      </div>

                      {/* Auto-Reply Composer */}
                      {showAutoReply === message._id && autoReplySelectedMessage && (
                        <div className="mt-3 relative z-10">
                          <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg shadow-sm">
                            <div className="text-xs text-gray-600 mb-2 flex items-center">
                              <Sparkles className="w-3 h-3 mr-1 text-purple-500" />
                              AI Reply Suggestions for: "{autoReplySelectedMessage.content.substring(0, 50)}..."
                            </div>
                            <ErrorBoundary
                              fallback={
                                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                                  Failed to load AI suggestions. Please try again.
                                </div>
                              }
                            >
                              <AutoReplyComposer
                                messageContent={autoReplySelectedMessage.content}
                                channelContext={`#${currentChannel.name}`}
                                onSelectReply={handleSelectAutoReply}
                                className="bg-white rounded-md"
                              />
                            </ErrorBoundary>
                          </div>
                        </div>
                      )}

                      {/* Message Reactions and Thread */}
                      <div className="mt-1 flex items-center space-x-2">
                        <MessageActions
                          messageId={message._id}
                          reactions={message.reactions || []}
                          onReactionUpdate={(reactions) => handleUpdateMessageReactions(message._id, reactions)}
                        />
                        {message.threadReplyCount > 0 && (
                          <ThreadButton
                            messageId={message._id}
                            replyCount={message.threadReplyCount}
                            onStartThread={handleStartThread}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );              })}
              <div ref={messagesEndRef} />
            </div>
          )
        ) : (
          // Pinned Items Tab Content
          loadingPinned ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : pinnedItems.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#F8F8F8' }}>
                  <Paperclip className="w-12 h-12" style={{ color: '#868686' }} />
                </div>
                <h3 className="text-2xl font-bold mb-4" style={{ color: '#1D1C1D' }}>
                  No pinned items yet
                </h3>
                <p className="max-w-md mx-auto" style={{ color: '#616061' }}>
                  Pin important messages, docs, and files to keep them handy. Look for the pin option in the message menu.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-8 py-2">
              {pinnedItems.map((message: any) => (
                <div key={message._id} className="group hover:bg-gray-50 -mx-8 px-8 py-3 transition-colors relative border-l-4 border-yellow-400 bg-yellow-50">
                  <div className="flex items-start space-x-2">
                    <div className="text-yellow-600 mt-1">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-sm" style={{ color: '#1D1C1D' }}>
                          {message.author?.username || 'Unknown User'}
                        </span>
                        <span className="text-xs text-yellow-600">Pinned Message</span>
                        <span className="text-xs" style={{ color: '#868686' }}>
                          {formatTime(message.createdAt)}
                        </span>
                        {message.pinnedAt && (
                          <span className="text-xs text-yellow-600">
                            Pinned {formatTime(message.pinnedAt)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm leading-5 whitespace-pre-wrap break-words" style={{ color: '#1D1C1D' }}>
                        <MessageRenderer 
                          content={message.content || 'Pinned item'}
                          mentions={message.mentions || []}
                          users={workspaceUsers}
                          isChannel={!!currentChannel}
                        />
                        {message.isEdited && (
                          <span className="text-xs ml-1" style={{ color: '#868686' }}>(edited)</span>
                        )}
                        
                        {/* File Display for pinned messages */}
                        {(message.messageType === 'file' || message.messageType === 'image') && message.fileUrl && (
                          <div className="mt-2">
                            <FileDisplay
                              file={{
                                url: message.fileUrl,
                                name: message.fileName || 'Unknown file',
                                size: message.fileSize || 0,
                                type: message.fileType || 'application/octet-stream',
                                path: message.fileUrl
                              }}
                              showDownloadButton={true}
                              compact={false}
                            />
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        <button
                          onClick={() => handleUnpinMessage(message._id)}
                          className="text-xs text-red-600 hover:text-red-800 hover:underline"
                        >
                          Unpin
                        </button>
                        {message.threadReplyCount > 0 && (
                          <button
                            onClick={() => handleStartThread(message._id)}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View Thread ({message.threadReplyCount} replies)
                          </button>
                        )}
                        <button
                          onClick={() => handleStartThread(message._id)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Reply in Thread
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Typing Indicators - Fixed above input */}
      {currentChannel && typingUsers[currentChannel._id] && typingUsers[currentChannel._id].length > 0 && (
        <div className="px-8 py-2 text-sm flex-shrink-0" style={{ color: '#616061', borderTop: '1px solid #E1E1E1' }}>
          {typingUsers[currentChannel._id].length === 1 
            ? `${typingUsers[currentChannel._id][0]} is typing...`
            : typingUsers[currentChannel._id].length === 2
            ? `${typingUsers[currentChannel._id][0]} and ${typingUsers[currentChannel._id][1]} are typing...`
            : `${typingUsers[currentChannel._id].slice(0, -1).join(', ')} and ${typingUsers[currentChannel._id].slice(-1)} are typing...`
          }
        </div>
      )}

      {/* Message Input - Fixed at bottom */}
      <div className="px-6 py-3 bg-white flex-shrink-0" style={{ borderTop: '1px solid #E1E1E1' }}>
        {/* Tone & Impact Meter - Above Input */}
        {newMessage.trim() && (
          <div className="mb-2">
            <ToneImpactMeter text={newMessage} />
          </div>
        )}
        
        {/* Message Input Container - Slack Style */}
        <div className="border border-gray-200 rounded-[9px] bg-white shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition-all">
          {/* File Previews Inside Input */}
          {uploadedFiles.length > 0 && (
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 space-y-2">
              <div className="text-xs text-green-600 mb-2">
                📎 {uploadedFiles.length} file(s) uploaded
              </div>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-3 bg-gray-50 rounded-md p-2.5">
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
                    onClick={() => removeUploadedFile(file)}
                    className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Row - Slack-style */}
          <div className="flex items-end px-4 py-3">
            {/* Text Input with integrated buttons */}
            <form onSubmit={handleSendMessage} className="flex-1">
              <div className="flex items-end bg-white border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                
                {/* Left Actions inside input */}
                <div className="flex items-center space-x-1 px-3 py-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.doc,.docx"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      console.log('📎 Paperclip button clicked');
                      console.log('📎 File input ref:', fileInputRef.current);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    title="Upload file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (textareaRef.current) {
                        const textarea = textareaRef.current;
                        const cursorPosition = textarea.selectionStart;
                        const newText = newMessage.substring(0, cursorPosition) + '@' + newMessage.substring(cursorPosition);
                        setNewMessage(newText);
                        setShowMentionDropdown(true);
                        setMentionQuery('');
                        setMentionPosition(cursorPosition);
                        
                        // Focus textarea and position cursor
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
                        }, 0);
                      }
                    }}
                    className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    title="Mention someone"
                  >
                    <AtSign className="w-4 h-4" />
                  </button>
                </div>

                {/* Text Input Area */}
                <div className="flex-1 relative min-w-0">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextareaChange}
                    placeholder={`Message #${currentChannel.name}`}
                    className="w-full px-3 py-2.5 border-0 resize-none focus:ring-0 focus:outline-none text-sm placeholder-gray-500 leading-5 bg-transparent"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (showMentionDropdown && filteredMembers.length > 0) {
                          // Select first mention if dropdown is open
                          insertMention(filteredMembers[0].username);
                        } else {
                          handleSendMessage(e);
                        }
                      } else if (e.key === 'Escape' && showMentionDropdown) {
                        setShowMentionDropdown(false);
                        setMentionQuery('');
                      }
                    }}
                    style={{
                      minHeight: '40px',
                      maxHeight: '200px',
                    }}
                    disabled={sending}
                  />
                  
                  {/* Mention Dropdown */}
                  {showMentionDropdown && filteredMembers.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-20 w-64">
                      {filteredMembers.slice(0, 5).map((member) => (
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
                            {!(member as any).isSpecial && (member as any).profession && (
                              <p className="text-xs text-gray-500 truncate">{(member as any).profession}</p>
                            )}
                            {(member as any).isSpecial && (
                              <p className="text-xs text-gray-500 truncate">
                                {(member as any).type === 'channel' ? 'Notify channel' : 'Notify everyone'}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Right Actions inside input */}
                <div className="flex items-center space-x-1 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    title="Add emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  
                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && uploadedFiles.length === 0) || sending}
                    className={`flex items-center justify-center w-9 h-9 rounded-md transition-all ${
                      (!newMessage.trim() && uploadedFiles.length === 0) || sending
                        ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                        : 'text-white bg-[#007a5a] hover:bg-[#006644] shadow-sm hover:shadow-md'
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
        </div>
      </div>
      
      {/* Emoji Picker - Floating above input */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-0 mb-2">
          <div ref={emojiPickerRef} className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20">
            <EmojiPicker 
              onEmojiClick={handleEmojiSelect}
              searchDisabled
              height={320}
              width={400}
            />
          </div>
        </div>
      )}
      </div>

      {/* Meeting Notes Generator */}
      {showMeetingNotes && currentChannel && (
        <MeetingNotesGenerator
          channelId={currentChannel._id}
          channelName={currentChannel.name}
          onClose={() => setShowMeetingNotes(false)}
        />
      )}
      
      {/* Thread Sidebar */}
      {showThreadSidebar && (
        <ThreadSidebar
          isOpen={showThreadSidebar}
          onClose={handleCloseThread}
          parentMessage={selectedThreadMessage}
          autoReply={threadAutoReply}
          onAutoReplyUsed={() => setThreadAutoReply('')}
        />
      )}
    </div>
  );
}

export default MessagingArea;
