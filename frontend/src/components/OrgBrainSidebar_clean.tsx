import React, { useState } from 'react';
import { Search, Brain, MessageSquare, Sparkles, ChevronRight } from 'lucide-react';
import { aiService } from '../lib/aiService';
import { useAppStore } from '../store/appStore';
import type { OrgBrainResponse } from '../types/ai';

interface OrgBrainSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrgBrainSidebar: React.FC<OrgBrainSidebarProps> = ({ isOpen, onClose }) => {
  const { currentWorkspace } = useAppStore();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OrgBrainResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !currentWorkspace) return;

    setIsSearching(true);
    try {
      const results = await aiService.searchOrgBrain(query, currentWorkspace._id);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Org Brain</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything about your workspace..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isSearching}
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || isSearching}
              className="w-full mt-3 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 inline mr-2" />
                  Search Knowledge
                </>
              )}
            </button>
          </form>

          {/* Search Results */}
          {searchResults && (
            <div className="space-y-4">
              {/* AI Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start space-x-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-purple-900">AI Summary</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {searchResults.aiResponse}
                </p>
              </div>

              {/* Related Messages */}
              {searchResults.results && searchResults.results.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Related Messages ({searchResults.results.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults.results.map((result: any, index: number) => (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs font-medium text-purple-600">
                            #{result.source?.channelName || 'Unknown Channel'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(result.source?.timestamp || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 line-clamp-3">
                          {result.content}
                        </p>
                        <div className="mt-2 text-xs text-gray-600">
                          by {result.source?.author || 'Unknown User'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Examples */}
          {!searchResults && !isSearching && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Try asking about:</h3>
              <div className="space-y-2">
                {[
                  "What decisions were made about the project?",
                  "Who is working on the new feature?",
                  "What are the latest updates on the timeline?",
                  "Any discussion about the budget?"
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(example)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrgBrainSidebar;
