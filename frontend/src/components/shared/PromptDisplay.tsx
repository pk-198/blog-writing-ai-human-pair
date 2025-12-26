/**
 * PromptDisplay - Displays the exact LLM prompt sent to OpenAI
 * Shows prompts in a collapsible accordion with variable highlighting
 */
'use client';

import { useState } from 'react';

interface PromptDisplayProps {
  prompt: string | null | undefined;
  title?: string;
}

export default function PromptDisplay({
  prompt,
  title = "LLM Prompt Sent to OpenAI"
}: PromptDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Backward compatibility: hide component if no prompt
  if (!prompt) {
    return null;
  }

  // Highlight variables in the prompt
  // Variables are marked as {{VARIABLE_NAME:value}} in the backend
  const highlightVariables = (text: string): JSX.Element[] => {
    const parts: JSX.Element[] = [];
    // Fixed regex: Use non-greedy match to handle JSON values with } characters
    const regex = /\{\{([^:]+):([\s\S]*?)\}\}/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>
            {text.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add highlighted variable
      const varName = match[1];
      const varValue = match[2];

      parts.push(
        <span key={`var-${key++}`} className="inline-flex flex-wrap items-baseline gap-1">
          <span className="bg-maroon-900 text-white px-1.5 py-0.5 rounded text-xs font-bold">
            {varName}
          </span>
          <span className="text-maroon-700 font-medium">
            {varValue}
          </span>
        </span>
      );

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${key++}`}>
          {text.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className="border-2 border-purple-200 rounded-lg bg-purple-50 mt-6">
      {/* Header - Clickable to expand/collapse */}
      <div
        className="p-4 cursor-pointer flex justify-between items-center hover:bg-purple-100 transition-colors rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
            <p className="text-xs text-gray-600">
              Click to {isExpanded ? 'hide' : 'view'} the exact prompt sent to the AI
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-purple-600 transition-transform duration-200 ${
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
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t-2 border-purple-200 p-6 bg-white rounded-b-lg">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-blue-900">
                <strong>Variable Highlighting:</strong> Dark maroon labels indicate data sources (e.g., user inputs, outlines, competitor data). This shows exactly what context was provided to the AI.
              </div>
            </div>
          </div>

          <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto leading-relaxed">
            {highlightVariables(prompt)}
          </pre>
        </div>
      )}
    </div>
  );
}
