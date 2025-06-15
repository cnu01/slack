import { parseMentions } from '../utils/mentionUtils';

interface User {
  _id: string;
  username: string;
  email?: string;
  profession?: string;
  avatar?: string;
}

interface Mention {
  type: 'user' | 'channel' | 'everyone';
  targetId?: string;
  displayText: string;
}

interface MessageRendererProps {
  content: string;
  mentions?: Mention[];
  users?: User[];
  isChannel?: boolean;
}

export function MessageRenderer({ 
  content, 
  mentions = [], 
  users = [], 
  isChannel = true 
}: MessageRendererProps) {
  // Always parse mentions from content to catch any @mentions
  const parsedMentions = parseMentions(content, users, isChannel);
  
  // Combine provided mentions with parsed ones, removing duplicates
  const allMentions = [...mentions, ...parsedMentions].filter((mention, index, self) => 
    index === self.findIndex(m => m.displayText === mention.displayText)
  );
  
  // Render content with mentions highlighted
  let renderedContent = content;
  
  // Simple approach: find all @mentions in content and wrap them
  renderedContent = content.replace(/@(\w+)/g, (match, username) => {
    // Check if this is a special mention
    if (username === 'channel' && isChannel) {
      return `<span class="mention mention-channel">@${username}</span>`;
    } else if (username === 'everyone' && isChannel) {
      return `<span class="mention mention-everyone">@${username}</span>`;
    } else {
      // Check if this is a valid user
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (user) {
        return `<span class="mention mention-user">@${username}</span>`;
      }
    }
    return match; // Return original if no match
  });
  
  return (
    <div 
      className="message-content"
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}

// CSS classes for mentions (to be added to global styles)
export const mentionStyles = `
.mention {
  color: #2563eb;
  background-color: #dbeafe;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
}

.mention:hover {
  background-color: #bfdbfe;
}

.mention-user {
  color: #2563eb;
}

.mention-channel {
  color: #059669;
}

.mention-everyone {
  color: #dc2626;
  background-color: #fee2e2;
}

.mention-everyone:hover {
  background-color: #fecaca;
}
`;
