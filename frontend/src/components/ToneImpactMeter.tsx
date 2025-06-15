import React, { useEffect, useState } from 'react';
import { aiService } from '../lib/aiService';
import type { MessageAnalysis } from '../types/ai';

interface ToneImpactMeterProps {
  text: string;
  className?: string;
}

const ToneImpactMeter: React.FC<ToneImpactMeterProps> = ({ text, className = '' }) => {
  const [analysis, setAnalysis] = useState<MessageAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const analyzeText = async () => {
      if (!text.trim()) {
        setAnalysis(null);
        return;
      }

      setIsAnalyzing(true);
      try {
        const result = await aiService.analyzeMessage(text);
        setAnalysis(result);
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Debounce the analysis
    const timeoutId = setTimeout(analyzeText, 500);
    return () => clearTimeout(timeoutId);
  }, [text]);

  if (!text.trim() || !analysis) {
    return null;
  }

  // Ensure we have valid analysis data before proceeding
  const toneIndicators = aiService.getToneIndicators(analysis);
  const impactIndicator = aiService.getImpactIndicator(analysis.impact);
  const sentimentColor = aiService.getSentimentColor(analysis.sentiment);
  const sentimentLabel = aiService.getSentimentLabel(analysis.sentiment);

  const getColorClass = (color: string, type: 'bg' | 'text' | 'border') => {
    const prefix = type === 'bg' ? 'bg' : type === 'text' ? 'text' : 'border';
    switch (color) {
      case 'red': return `${prefix}-red-500`;
      case 'yellow': return `${prefix}-yellow-500`;
      case 'green': return `${prefix}-green-500`;
      case 'blue': return `${prefix}-blue-500`;
      case 'purple': return `${prefix}-purple-500`;
      default: return `${prefix}-gray-500`;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-md px-3 py-2 text-xs shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Tone Indicators - Compact */}
          {toneIndicators.length > 0 && (
            <div className="flex items-center space-x-1">
              <span className="text-gray-500 text-xs">Tone:</span>
              <div className="flex space-x-1">
                {toneIndicators.slice(0, 2).map((indicator, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 ${getColorClass(indicator.color, 'text')}`}
                  >
                    {indicator.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Impact - Compact */}
          <div className="flex items-center space-x-1">
            <span className="text-gray-500 text-xs">Impact:</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 ${getColorClass(impactIndicator.color, 'text')}`}
            >
              {impactIndicator.label}
            </span>
          </div>

          {/* Sentiment - Compact */}
          <div className="flex items-center space-x-1">
            <span className="text-gray-500 text-xs">Sentiment:</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 ${getColorClass(sentimentColor, 'text')}`}
            >
              {sentimentLabel}
            </span>
          </div>
        </div>

        {/* Confidence - Compact */}
        {analysis.confidence !== undefined && typeof analysis.confidence === 'number' && (
          <div className="flex items-center space-x-1">
            <span className="text-gray-500 text-xs">Confidence:</span>
            <span className="text-xs font-medium text-gray-700">
              {Math.round(analysis.confidence * 100)}%
            </span>
            {isAnalyzing && (
              <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent ml-1" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToneImpactMeter;
