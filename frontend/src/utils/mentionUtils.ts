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

/**
 * Parse @mentions from message content and extract mention data
 */
export function parseMentions(content: string, users: User[], isChannel: boolean = true): Mention[] {
  const mentions: Mention[] = [];
  
  // Match @username, @channel, @everyone patterns
  const mentionRegex = /@(\w+)/g;
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionText = match[1];
    
    // Handle special mentions
    if (mentionText === 'channel' && isChannel) {
      mentions.push({
        type: 'channel',
        displayText: '@channel'
      });
    } else if (mentionText === 'everyone' && isChannel) {
      mentions.push({
        type: 'everyone',
        displayText: '@everyone'
      });
    } else {
      // Look for user mentions
      const user = users.find(u => u.username.toLowerCase() === mentionText.toLowerCase());
      if (user) {
        mentions.push({
          type: 'user',
          targetId: user._id,
          displayText: `@${user.username}`
        });
      }
    }
  }
  
  return mentions;
}

/**
 * Render message content with mentions highlighted in blue
 */
export function renderMessageWithMentions(content: string, mentions: Mention[] = []): string {
  let renderedContent = content;
  
  // Replace each mention with a styled span
  mentions.forEach(mention => {
    const mentionRegex = new RegExp(`@${mention.displayText.slice(1)}`, 'gi');
    renderedContent = renderedContent.replace(
      mentionRegex,
      `<span style="color: #3b82f6; background-color: #dbeafe; padding: 1px 4px; border-radius: 3px;">@${mention.displayText.slice(1)}</span>`
    );
  });
  
  return renderedContent;
}

/**
 * Get filtered users for mention dropdown
 */
export function getFilteredMentionUsers(query: string, users: User[], isChannel: boolean = true): Array<User | { username: string; isSpecial: true; type: 'channel' | 'everyone' }> {
  const filtered: Array<User | { username: string; isSpecial: true; type: 'channel' | 'everyone' }> = [];
  
  // Add special mentions for channels
  if (isChannel) {
    if ('channel'.includes(query.toLowerCase())) {
      filtered.push({ username: 'channel', isSpecial: true, type: 'channel' });
    }
    if ('everyone'.includes(query.toLowerCase())) {
      filtered.push({ username: 'everyone', isSpecial: true, type: 'everyone' });
    }
  }
  
  // Add user mentions
  const userMatches = users.filter(user => 
    user.username.toLowerCase().includes(query.toLowerCase())
  );
  
  filtered.push(...userMatches);
  
  return filtered;
}

/**
 * Check if current user is mentioned in a message
 */
export function isUserMentioned(mentions: Mention[], currentUserId: string): boolean {
  return mentions.some(mention => 
    mention.type === 'user' && mention.targetId === currentUserId ||
    mention.type === 'channel' ||
    mention.type === 'everyone'
  );
}
