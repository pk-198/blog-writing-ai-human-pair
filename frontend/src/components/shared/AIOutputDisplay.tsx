/**
 * AIOutputDisplay - Component for displaying AI-generated content
 * Supports JSON, markdown, and plain text formatting
 */

import React from 'react';

interface AIOutputDisplayProps {
  title: string;
  data: any;
  format?: 'json' | 'markdown' | 'text';
  collapsible?: boolean;
}

export default function AIOutputDisplay({
  title,
  data,
  format = 'json',
  collapsible = false
}: AIOutputDisplayProps) {
  const [isExpanded, setIsExpanded] = React.useState(!collapsible);

  const renderContent = () => {
    if (!data) {
      return (
        <div className="text-gray-500 italic">
          No data available
        </div>
      );
    }

    switch (format) {
      case 'json':
        return (
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        );

      case 'markdown':
        return (
          <div className="prose max-w-none">
            {/* Simple markdown rendering - can be enhanced with react-markdown */}
            <div className="whitespace-pre-wrap">{data}</div>
          </div>
        );

      case 'text':
        return (
          <div className="text-gray-800 whitespace-pre-wrap">
            {data}
          </div>
        );

      default:
        return <div>{String(data)}</div>;
    }
  };

  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50 mb-4">
      <div
        className={`flex items-center justify-between p-4 ${
          collapsible ? 'cursor-pointer hover:bg-blue-100' : ''
        }`}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="font-semibold text-blue-900">{title}</h3>
        </div>
        {collapsible && (
          <svg
            className={`w-5 h-5 text-blue-600 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-blue-200">
          {renderContent()}
        </div>
      )}
    </div>
  );
}
