import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, AtSign, MessageSquare, Menu, User, Hash, Lock, Users } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../lib/api';
import { socketClient } from '../lib/socketClient';
import FileDisplay from './FileDisplay';
import MessageActions from './MessageActions';
import ThreadSidebar from './ThreadSidebar';
import MessageMenu from './MessageMenu';
import type { UploadedFile } from '../lib/fileUploadService';

function DirectMessagesView() {
  const { 
    currentDMUser,
    user,
    messages, 
    setMessages,
    addMessage,
    typingUsers,
    addTypingUser,
    removeTypingUser,
    toggleSidebar,
    onlineUsers
  } = useAppStore();

  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  // Thread state
  const [showThreadSidebar, setShowThreadSidebar] = useState(false);
  const [selectedThreadMessage, setSelectedThreadMessage] = useState<any>(null);
  // Message actions state
  const [showMessageMenu, setShowMessageMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate a DM conversation ID from user IDs
  const getDMConversationId = () => {
    if (!user || !currentDMUser) return null;
    const ids = [user._id, currentDMUser._id].sort();
    return `dm-${ids.join('-')}`;
  };

  useEffect(() => {
    if (currentDMUser) {
      console.log('🔄 DM User changed to:', currentDMUser.username);
      // Reset messages when switching DMs
      setMessages([]);
      loadDMMessages();
    }
  }, [currentDMUser?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up real-time message listening
  useEffect(() => {
    if (currentDMUser) {
      const conversationId = getDMConversationId();
      if (conversationId) {
        const unsubscribeMessage = socketClient.onMessage((message) => {
          console.log('📨 Received real-time DM message:', message);
          if (message.channel === conversationId) {
            console.log('✅ Adding message to current DM:', currentDMUser.username);
            addMessage(message);
          }
        });

        const unsubscribeTyping = socketClient.onTyping((typing) => {
          if (typing.isTyping && typing.username !== user?.username) {
            addTypingUser(conversationId, typing.username);
            
            // Remove typing status after 3 seconds
            setTimeout(() => {
              removeTypingUser(conversationId, typing.username);
            }, 3000);
          } else {
            removeTypingUser(conversationId, typing.username);
          }
        });

        return () => {
          unsubscribeMessage();
          unsubscribeTyping();
        };
      }
    }
  }, [currentDMUser, user, addMessage, addTypingUser, removeTypingUser]);

  // Join DM channel in socket when DM user changes
  useEffect(() => {
    if (currentDMUser) {
      const conversationId = getDMConversationId();
      if (conversationId) {
        socketClient.joinChannel(conversationId);
        return () => {
          socketClient.leaveChannel(conversationId);
        };
      }
    }
  }, [currentDMUser, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadDMMessages = async () => {
    if (!currentDMUser || !user) return;
    
    try {
      setLoading(true);
      console.log('🔄 Loading DM messages with:', currentDMUser.username);
      const response = await apiClient.getDMMessages(currentDMUser._id);
      console.log('📩 Loaded DM messages:', response.messages.length);
      setMessages(response.messages || []);
    } catch (error) {
      console.error('Failed to load DM messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDMUser || (!newMessage.trim() && uploadedFiles.length === 0) || sending || !user) return;

    try {
      setSending(true);
      
      const conversationId = getDMConversationId();
      if (conversationId) {
        // Stop typing indicator
        socketClient.stopTyping(conversationId);
      }
      
      // Send text message if there's content
      if (newMessage.trim()) {
        console.log('🚀 Sending DM text message to:', currentDMUser.username);
        const response = await apiClient.sendDMMessage(currentDMUser._id, newMessage.trim());
        console.log('✅ DM text message sent successfully:', response.message);
      }

      // Send file messages for each uploaded file
      for (const file of uploadedFiles) {
        console.log('🚀 Sending DM file message to:', currentDMUser.username);
        
        // For now, send as text message with file info until we update backend
        const fileMessage = `📎 Uploaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
        const response = await apiClient.sendDMMessage(currentDMUser._id, fileMessage);
        console.log('✅ DM file message sent successfully:', response.message);
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
    if (!currentDMUser || !user) return;

    const conversationId = getDMConversationId();
    if (conversationId) {
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
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    
    // Handle mentions
    const atIndex = value.lastIndexOf('@');
    if (atIndex !== -1 && (atIndex === 0 || value[atIndex - 1] === ' ')) {
      const mentionText = value.slice(atIndex + 1);
      if (!mentionText.includes(' ')) {
        setShowMentionDropdown(true);
        setMentionQuery(mentionText);
        setMentionPosition(atIndex);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
    
    // Trigger typing indicator
    handleTyping();
  };

  const removeUploadedFile = (fileToRemove: UploadedFile) => {
    setUploadedFiles(prev => prev.filter(file => file.url !== fileToRemove.url));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      // Create mock uploaded file for now
      const uploadedFile: UploadedFile = {
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type
      };
      
      setUploadedFiles(prev => [...prev, uploadedFile]);
    });
    
    // Clear input
    e.target.value = '';
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
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      Array.from(files).forEach(file => {
        const uploadedFile: UploadedFile = {
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type
        };
        
        setUploadedFiles(prev => [...prev, uploadedFile]);
      });
    }
  };

  const handleThreadClick = (message: any) => {
    setSelectedThreadMessage(message);
    setShowThreadSidebar(true);
  };

  const handleCloseThread = () => {
    setShowThreadSidebar(false);
    setSelectedThreadMessage(null);
  };

  const handleMessageContextMenu = (e: React.MouseEvent, message: any) => {
    e.preventDefault();
    setShowMessageMenu({
      messageId: message._id,
      x: e.pageX,
      y: e.pageY
    });
  };

  const closeMessageMenu = () => {
    setShowMessageMenu(null);
  };

  const insertMention = (username: string) => {
    const beforeMention = newMessage.substring(0, mentionPosition);
    const afterMention = newMessage.substring(mentionPosition + mentionQuery.length + 1);
    const newText = beforeMention + `@${username} ` + afterMention;
    
    setNewMessage(newText);
    setShowMentionDropdown(false);
    setMentionQuery('');
    
    // Focus textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
      const newCursorPosition = beforeMention.length + username.length + 2;
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    }
  };

  if (!currentDMUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
          <p className="text-gray-500">Choose a person from the sidebar to start a direct message conversation.</p>
        </div>
      </div>
    );
  }

  const conversationId = getDMConversationId();
  const currentTypingUsers = conversationId ? typingUsers[conversationId] || [] : [];
  const filteredMembers = [currentDMUser]; // For mentions in DM, only the other user

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main DM Area */}
      <div 
        className={`flex-1 flex flex-col bg-white ${dragOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* DM Header */}
        <div className="flex items-center justify-between px-20 py-4 bg-white" style={{ borderBottom: '1px solid #E1E1E1' }}>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleSidebar}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                {currentDMUser.avatar ? (
                  <img src={currentDMUser.avatar} alt="User avatar" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  currentDMUser.username?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{currentDMUser.username}</h1>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    onlineUsers[currentDMUser._id]?.status === 'online' ? 'bg-green-500' :
                    onlineUsers[currentDMUser._id]?.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                  <p className="text-sm text-gray-500">
                    {onlineUsers[currentDMUser._id]?.status === 'online' ? 'Active' :
                     onlineUsers[currentDMUser._id]?.status === 'away' ? 'Away' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-20 pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {currentDMUser.avatar ? (
                  <img src={currentDMUser.avatar} alt="User avatar" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-purple-600">
                    {currentDMUser.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                This is the beginning of your direct message history with {currentDMUser.username}
              </h3>
              <p className="text-gray-500">
                Only the two of you are in this conversation, and no one else can join it.
              </p>
            </div>
          ) : (
            messages.map((message: any, index: number) => {
              const isOwnMessage = message.author._id === user?._id;
              const showAvatar = index === 0 || messages[index - 1]?.author._id !== message.author._id;
              const showTimestamp = index === 0 || 
                new Date(message.createdAt).getTime() - new Date(messages[index - 1]?.createdAt).getTime() > 300000; // 5 minutes
              
              return (
                <div 
                  key={message._id} 
                  className="group mb-2 hover:bg-gray-50 px-4 py-1 -mx-4 rounded transition-colors"
                  onContextMenu={(e) => handleMessageContextMenu(e, message)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 flex-shrink-0">
                      {showAvatar ? (
                        <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                          {message.author.avatar ? (
                            <img src={message.author.avatar} alt="User avatar" className="w-9 h-9 rounded-lg object-cover" />
                          ) : (
                            message.author.username?.charAt(0)?.toUpperCase() || 'U'
                          )}
                        </div>
                      ) : (
                        <div className="w-9 h-9 flex items-center justify-center">
                          <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      {/* Message Header */}
                      {showAvatar && (
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{message.author.username}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {/* Message Body */}
                      <div className="text-sm text-gray-900 leading-relaxed">
                        {message.messageType === 'file' && message.fileUrl ? (
                          <FileDisplay 
                            file={{
                              url: message.fileUrl,
                              name: message.fileName,
                              size: message.fileSize,
                              type: message.fileType
                            }}
                            showDownloadButton={true}
                            compact={false}
                          />
                        ) : null}
                        
                        {message.content && (
                          <div className="whitespace-pre-wrap break-words">
                            {message.content}
                            {message.isEdited && (
                              <span className="text-xs text-gray-500 ml-1">(edited)</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Message Actions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                        <MessageActions 
                          messageId={message._id}
                          reactions={message.reactions || []}
                          replyCount={message.threadReplyCount || 0}
                          onThreadClick={() => handleThreadClick(message)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Typing Indicator */}
          {currentTypingUsers.length > 0 && (
            <div className="px-4 py-2 flex items-center space-x-2 text-sm text-gray-500">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span>
                {currentTypingUsers.length === 1 
                  ? `${currentTypingUsers[0]} is typing...`
                  : `${currentTypingUsers.join(', ')} are typing...`
                }
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

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
                    placeholder={`Message ${currentDMUser.username}`}
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
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">@{member.username}</p>
                            <p className="text-xs text-gray-500 truncate">{member.profession}</p>
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
      </div>
      
      {/* Thread Sidebar */}
      {showThreadSidebar && selectedThreadMessage && (
        <ThreadSidebar
          isOpen={showThreadSidebar}
          onClose={handleCloseThread}
          parentMessage={selectedThreadMessage}
        />
      )}
      
      {/* Message Menu */}
      {showMessageMenu && (
        <MessageMenu
          messageId={showMessageMenu.messageId}
          x={showMessageMenu.x}
          y={showMessageMenu.y}
          onClose={closeMessageMenu}
        />
      )}
    </div>
  );
}

export default DirectMessagesView;
