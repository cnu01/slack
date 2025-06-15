import { useState, useEffect, useRef } from 'react';
import { Send, Hash, Lock, Users, Paperclip, Smile, AtSign, MessageSquare, Upload, Menu } from 'lucide-react';
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
        
        // Create a proper file message
        // const fileMessageData = {
        //   content: ``, // Empty content for file messages
        //   messageType: file.type.startsWith('image/') ? 'image' : 'file' as const,
        //   fileUrl: file.url,
        //   fileName: file.name,
        //   fileSize: file.size,
        //   fileType: file.type
        // };
        
        // For now, send as text message with file info until we update backend
        const fileMessage = `📎 Uploaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
        const response = await apiClient.sendMessage(currentChannel._id, fileMessage, []);
        console.log('✅ File message sent successfully:', response.message);
        
        // TODO: Update this when backend supports file messages properly
        // const response = await apiClient.sendFileMessage(currentChannel._id, fileMessageData);
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
    const validFiles = files.filter(file => {
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      const isValidType = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ].includes(file.type);
      return isValidSize && isValidType;
    });

    // Upload files to Firebase and get real URLs
    for (const file of validFiles) {
      try {
        console.log('🔄 Uploading file to Firebase:', file.name);
        const uploadedFile = await fileUploadService.uploadFile(
          file,
          currentWorkspace!._id,
          currentChannel!._id
        );
        console.log('✅ File uploaded successfully:', uploadedFile);
        setUploadedFiles(prev => [...prev, uploadedFile]);
      } catch (error) {
        console.error('❌ Failed to upload file:', error);
        // Show error to user (you could add a toast notification here)
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
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
    setMessages(
      messages.map(message => 
        message._id === messageId 
          ? { ...message, isPinned, pinnedAt: isPinned ? new Date().toISOString() : undefined }
          : message
      )
    );
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

  const getInitials = (username: string) => {
    return username.charAt(0).toUpperCase();
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
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-white min-h-0">
        {loading ? (
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
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-medium text-sm mr-2 mt-0.5 flex-shrink-0" 
                           style={{ backgroundColor: `hsl(${message.author.username.charCodeAt(0) * 137.5 % 360}, 70%, 50%)` }}>
                        {message.author.avatar ? (
                          <img src={message.author.avatar} alt={`${message.author.username} avatar`} className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          getInitials(message.author.username)
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
                          mentions={message.mentions}
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
              );
            })}
            <div ref={messagesEndRef} />
          </div>
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
      <div className="px-20 py-10 bg-white flex-shrink-0" style={{ borderTop: '1px solid #E1E1E1' }}>
        {/* Message Input Container - Slack Style */}
        <div className="border border-gray-200 rounded-[9px] bg-white shadow-sm focus-within:border-gray-300 focus-within:shadow-md transition-all">
          {/* File Previews Inside Input */}
          {uploadedFiles.length > 0 && (
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center space-x-3 bg-gray-50 rounded-md p-2.5">
                  <div className="flex items-center justify-center w-8 h-8 bg-slate-100 rounded-md">
                    {file.type.startsWith('image/') ? (
                      <span className="text-base">🖼️</span>
                    ) : (
                      <Paperclip className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)}MB</p>
                  </div>
                  <button
                    onClick={() => removeUploadedFile(file)}
                    className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-center px-3 py-2">
            {/* Left Actions */}
            <div className="flex items-center space-x-1 mr-2">
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
                onClick={() => fileInputRef.current?.click()}
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

            {/* Text Input */}
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center space-x-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  placeholder={`Message #${currentChannel.name}`}
                  className="w-full px-2 py-2 border-0 resize-none focus:ring-0 focus:outline-none text-sm placeholder-gray-500 leading-5"
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
                    minHeight: '2.25rem',
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
                          {/* For now using initials - will update when user avatars are available in workspace member data */}
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
              
              {/* Right Actions & Send Button */}
              <div className="flex items-center space-x-1">
                {/* Formatting Actions */}
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

export default MessagingArea;
