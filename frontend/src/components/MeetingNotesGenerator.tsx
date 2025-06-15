import React, { useState } from 'react';
import { FileText, Download, Sparkles } from 'lucide-react';
import { aiService } from '../lib/aiService';
import type { ConversationSummary } from '../types/ai';

interface MeetingNotesGeneratorProps {
  channelId: string;
  channelName: string;
  messageCount?: number;
  onClose: () => void;
}

const MeetingNotesGenerator: React.FC<MeetingNotesGeneratorProps> = ({
  channelId,
  channelName,
  messageCount = 50,
  onClose
}) => {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const result = await aiService.summarizeConversation(channelId, messageCount);
      setSummary(result);
    } catch (err) {
      setError('Failed to generate meeting notes. Please try again.');
      console.error('Summary generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (summary) {
      aiService.exportSummaryAsMarkdown(summary, channelName);
    }
  };

  React.useEffect(() => {
    generateSummary();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Meeting Notes</h2>
              <p className="text-sm text-gray-600">#{channelName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {isGenerating && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Generating Meeting Notes
            </h3>
            <p className="text-gray-600">
              Analyzing {messageCount} messages...
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-900 mb-2">
                Generation Failed
              </h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={generateSummary}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {summary && !isGenerating && (
          <div className="space-y-6">
            {/* Summary Header */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-2">AI Summary</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {summary?.summary || 'No summary available'}
                  </p>
                </div>
              </div>
            </div>

            {/* Meeting Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-1">Messages Analyzed</h4>
                <p className="text-2xl font-bold text-purple-600">{summary?.messageCount || 0}</p>
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
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-1">Duration</h4>
                {summary?.timeRange ? (
                  <p className="text-sm text-gray-600">
                    {Math.ceil((new Date(summary.timeRange.end).getTime() - new Date(summary.timeRange.start).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">N/A</p>
                )}
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Markdown Preview</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm">
                <pre className="whitespace-pre-wrap text-gray-700">
{`# Meeting Notes - ${channelName}

**Generated on:** ${new Date().toLocaleDateString()}
**Time Range:** ${summary?.timeRange ? `${new Date(summary.timeRange.start).toLocaleDateString()} - ${new Date(summary.timeRange.end).toLocaleDateString()}` : 'N/A'}
**Messages Analyzed:** ${summary?.messageCount || 0}

## Summary

${summary?.summary || 'No summary available'}

---
*Generated by AI Assistant*`}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleDownload}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Markdown</span>
              </button>
              <button
                onClick={generateSummary}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Regenerate
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingNotesGenerator;
