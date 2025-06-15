import React, { useState } from 'react';
import { FileText, Download, Sparkles, MessageSquare } from 'lucide-react';
import { aiService } from '../lib/aiService';
import type { ConversationSummary } from '../types/ai';

interface ThreadSummaryGeneratorProps {
  messageId: string;
  channelName: string;
  parentMessage: any;
  onClose: () => void;
}

const ThreadSummaryGenerator: React.FC<ThreadSummaryGeneratorProps> = ({
  messageId,
  channelName,
  parentMessage,
  onClose
}) => {
  const [summary, setSummary] = useState<(ConversationSummary & { threadInfo?: any }) | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      console.log('Generating thread summary for messageId:', messageId);
      const result = await aiService.summarizeThread(messageId);
      console.log('Thread summary result:', result);
      setSummary(result);
    } catch (err) {
      console.error('Thread summary generation failed:', err);
      console.error('Error details:', {
        messageId,
        error: err instanceof Error ? err.message : err,
        stack: err instanceof Error ? err.stack : undefined
      });
      setError('Failed to generate thread summary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (summary) {
      aiService.exportThreadSummaryAsMarkdown(summary, channelName);
    }
  };

  React.useEffect(() => {
    generateSummary();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Thread Summary</h2>
              <p className="text-sm text-gray-500">#{channelName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Analyzing thread conversation...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
          </div>
        )}

        {/* Error State */}
        {error && !isGenerating && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generation Failed</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={generateSummary}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success State */}
        {summary && !isGenerating && (
          <div className="space-y-6">
            {/* Original Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-2">Original Message</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {summary.threadInfo?.parentContent || parentMessage?.content || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-2">Thread Summary</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {summary?.summary || 'No summary available'}
                  </p>
                </div>
              </div>
            </div>

            {/* Thread Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-1">Total Messages</h4>
                <p className="text-2xl font-bold text-purple-600">{summary?.messageCount || 0}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-1">Thread Replies</h4>
                <p className="text-2xl font-bold text-purple-600">{summary?.threadInfo?.replyCount || 0}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-1">Time Range</h4>
                {summary?.timeRange ? (
                  <>
                    <p className="text-sm text-gray-600">
                      {new Date(summary.timeRange.start).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      to {new Date(summary.timeRange.end).toLocaleDateString()}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">N/A</p>
                )}
              </div>
            </div>

            {/* Download Button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={handleDownload}
                className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Summary (.md)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadSummaryGenerator;
