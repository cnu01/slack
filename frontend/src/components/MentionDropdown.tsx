import { Hash, Users } from 'lucide-react';

interface User {
  _id: string;
  username: string;
  email?: string;
  profession?: string;
  avatar?: string;
}

interface MentionItem extends User {
  isSpecial?: boolean;
  type?: 'channel' | 'everyone';
}

interface MentionDropdownProps {
  isOpen: boolean;
  items: MentionItem[];
  onSelect: (item: MentionItem) => void;
  maxResults?: number;
}

export function MentionDropdown({ 
  isOpen, 
  items, 
  onSelect, 
  maxResults = 5 
}: MentionDropdownProps) {
  if (!isOpen || items.length === 0) return null;

  const limitedItems = items.slice(0, maxResults);

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-20 w-64">
      {limitedItems.map((item) => (
        <button
          key={item.isSpecial ? `special-${item.username}` : item._id}
          type="button"
          onClick={() => onSelect(item)}
          className="w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center space-x-2 border-b border-gray-100 last:border-b-0 first:rounded-t-lg last:rounded-b-lg transition-colors"
        >
          {/* Icon/Avatar */}
          <div className="w-6 h-6 flex items-center justify-center">
            {item.isSpecial ? (
              item.type === 'channel' ? (
                <Hash className="w-4 h-4 text-blue-600" />
              ) : (
                <Users className="w-4 h-4 text-green-600" />
              )
            ) : (
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {item.avatar ? (
                  <img 
                    src={item.avatar} 
                    alt={`${item.username} avatar`} 
                    className="w-6 h-6 rounded-full object-cover" 
                  />
                ) : (
                  item.username.charAt(0).toUpperCase()
                )}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              @{item.username}
              {item.isSpecial && (
                <span className="ml-1 text-xs text-gray-500">
                  {item.type === 'channel' ? '(notify channel)' : '(notify everyone)'}
                </span>
              )}
            </p>
            {!item.isSpecial && item.profession && (
              <p className="text-xs text-gray-500 truncate">{item.profession}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
