/**
 * WorkflowStepCard - Displays a single workflow step with plagiarism scores
 */
'use client';

import { useState } from 'react';
import PromptDisplay from '../shared/PromptDisplay';

interface PlagiarismMatch {
  field: string;
  score: number;
  current: string;
  past: string;
}

interface PlagiarismDetails {
  overall_score: number;
  matches: PlagiarismMatch[];
}

interface BlogMatch {
  blog_session_id: string;
  blog_keyword: string;
  blog_created_at: string;
  plagiarism_details: PlagiarismDetails;
}

interface PlagiarismData {
  has_plagiarism: boolean;
  overall_score: number;
  level: string;
  color: string;
  matches_from_blogs: BlogMatch[];
}

interface StepData {
  step_number: number;
  step_name: string;
  owner: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  data: any;
  human_action?: string;
  skipped: boolean;
  skip_reason?: string;
  plagiarism?: PlagiarismData;
}

interface WorkflowStepCardProps {
  step: StepData;
}

export default function WorkflowStepCard({ step }: WorkflowStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  const getOwnerBadgeColor = (owner: string) => {
    switch (owner) {
      case 'AI':
        return 'bg-blue-100 text-blue-800';
      case 'Human':
        return 'bg-green-100 text-green-800';
      case 'AI+Human':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlagiarismEmoji = (color: string) => {
    switch (color) {
      case 'green':
        return '🟢';
      case 'yellow':
        return '🟡';
      case 'orange':
        return '🟠';
      case 'red':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header - Always Visible */}
      <div
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Step Title and Badges */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-bold text-gray-900">
                Step {step.step_number}: {step.step_name}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getOwnerBadgeColor(step.owner)}`}>
                {step.owner}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(step.status)}`}>
                {step.status.toUpperCase()}
              </span>
            </div>

            {/* Metadata Row */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
              {step.started_at && (
                <div>
                  <span className="font-medium">Started:</span> {formatDate(step.started_at)}
                </div>
              )}
              {step.completed_at && (
                <div>
                  <span className="font-medium">Completed:</span> {formatDate(step.completed_at)}
                </div>
              )}
              {step.duration_seconds !== null && step.duration_seconds !== undefined && (
                <div>
                  <span className="font-medium">Duration:</span> {formatDuration(step.duration_seconds)}
                </div>
              )}
            </div>

            {/* Plagiarism Score (if applicable) */}
            {step.plagiarism && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getPlagiarismEmoji(step.plagiarism.color)}</span>
                    <span className="font-semibold text-gray-900">Plagiarism Score:</span>
                    <span className={`text-lg font-bold ${
                      step.plagiarism.color === 'green' ? 'text-green-600' :
                      step.plagiarism.color === 'yellow' ? 'text-yellow-600' :
                      step.plagiarism.color === 'orange' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(step.plagiarism.overall_score * 100)}%
                    </span>
                    <span className="text-sm text-gray-600">({step.plagiarism.level})</span>
                  </div>
                  {step.plagiarism.has_plagiarism && (
                    <div className="text-sm text-gray-600">
                      {step.plagiarism.matches_from_blogs.length} match{step.plagiarism.matches_from_blogs.length !== 1 ? 'es' : ''} found
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Skipped Reason */}
            {step.skipped && step.skip_reason && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 font-semibold">⏭️ Skipped:</span>
                  <span className="text-yellow-800">{step.skip_reason}</span>
                </div>
              </div>
            )}

            {/* Warning Message (Proceeded with Fewer Inputs) */}
            {!step.skipped && step.data?.warning && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 font-semibold">⚠️ Warning:</span>
                  <span className="text-yellow-800">{step.data.warning}</span>
                </div>
              </div>
            )}

            {/* Fewer Inputs Details (for reviewers who want to see the flag) */}
            {!step.skipped && step.data?.proceeded_with_fewer && step.data?.fewer_inputs_reason && (
              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                <div className="flex items-start gap-2 text-orange-800">
                  <span className="font-semibold">Justification:</span>
                  <span className="italic">&ldquo;{step.data.fewer_inputs_reason}&rdquo;</span>
                </div>
              </div>
            )}
          </div>

          {/* Expand/Collapse Icon */}
          <div className="ml-4">
            <svg
              className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          {/* Human Action */}
          {step.human_action && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-semibold text-green-800 mb-1">Human Action:</div>
              <div className="text-green-900">{step.human_action}</div>
            </div>
          )}

          {/* LLM Prompt Display */}
          <PromptDisplay
            prompt={step.data?.llm_prompt}
            title="LLM Prompt Used in This Step"
          />

          {/* Plagiarism Details */}
          {step.plagiarism && step.plagiarism.has_plagiarism && (
            <div className="mb-6">
              <h4 className="text-md font-bold text-gray-900 mb-3">Plagiarism Details</h4>
              {step.plagiarism.matches_from_blogs.map((blogMatch, idx) => (
                <div key={idx} className="mb-4 p-4 bg-white border border-gray-300 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">
                        Match from: {blogMatch.blog_keyword}
                      </div>
                      <div className="text-sm text-gray-600">
                        Session: {blogMatch.blog_session_id}
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {formatDate(blogMatch.blog_created_at)}
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${
                      step.plagiarism?.color === 'green' ? 'text-green-600' :
                      step.plagiarism?.color === 'yellow' ? 'text-yellow-600' :
                      step.plagiarism?.color === 'orange' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(blogMatch.plagiarism_details.overall_score * 100)}%
                    </div>
                  </div>

                  {/* Field-level matches */}
                  {blogMatch.plagiarism_details.matches.length > 0 && (
                    <div className="space-y-2">
                      {blogMatch.plagiarism_details.matches.map((match, matchIdx) => (
                        <div key={matchIdx} className="p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm text-gray-700">{match.field}</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {Math.round(match.score * 100)}% similar
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>
                              <span className="font-semibold">Current:</span> {match.current}
                            </div>
                            <div>
                              <span className="font-semibold">Previous:</span> {match.past}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step Data Summary */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-bold text-gray-900">Step Data</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRawData(!showRawData);
                }}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {showRawData ? 'Hide' : 'Show'} Raw JSON
              </button>
            </div>

            {/* Special rendering for Step 18 (FAQ Accordion) */}
            {!showRawData && step.step_number === 18 && step.data && Object.keys(step.data).length > 0 && (() => {
              // Backward compatibility: compute counts from source field if not present
              const allFaqs = step.data.faqs || [];
              const userCount = step.data.user_count ?? allFaqs.filter((f: any) => f.source === 'user').length;
              const aiCount = step.data.ai_count ?? allFaqs.filter((f: any) => f.source === 'ai').length;
              const totalCount = step.data.total_count ?? allFaqs.length;

              return (
                <div className="p-4 bg-white border border-gray-300 rounded-lg space-y-4">
                  {/* FAQ Count Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {userCount}
                      </div>
                      <div className="text-xs text-gray-600">User FAQs</div>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {aiCount}
                      </div>
                      <div className="text-xs text-gray-600">AI FAQs</div>
                    </div>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {totalCount}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                  </div>

                {/* FAQ List Preview */}
                {step.data.faqs && step.data.faqs.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-700">FAQs:</div>
                    {step.data.faqs.slice(0, 3).map((faq: any, idx: number) => {
                      // Backward compatibility: handle FAQs without source field (old format)
                      const isLegacyFaq = !faq.source;
                      return (
                        <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              faq.source === 'user'
                                ? 'bg-blue-100 text-blue-800'
                                : isLegacyFaq
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {faq.source === 'user' ? '👤 User' : isLegacyFaq ? '📝 FAQ' : '🤖 AI'}
                            </span>
                          <span className="text-sm font-medium text-gray-900">
                            {faq.question}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 pl-2">
                          {faq.answer?.substring(0, 100)}{faq.answer?.length > 100 ? '...' : ''}
                        </div>
                      </div>
                    );
                    })}
                    {step.data.faqs.length > 3 && (
                      <div className="text-sm text-gray-500 italic">
                        ... and {step.data.faqs.length - 3} more FAQs
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })()}

            {/* Generic rendering for other steps */}
            {!showRawData && step.step_number !== 18 && step.data && Object.keys(step.data).length > 0 && (
              <div className="p-4 bg-white border border-gray-300 rounded-lg">
                <div className="space-y-2">
                  {Object.entries(step.data).slice(0, 5).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-semibold text-gray-700">{key}:</span>{' '}
                      <span className="text-gray-900">
                        {typeof value === 'object' ? JSON.stringify(value).substring(0, 100) + '...' : String(value).substring(0, 100)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(step.data).length > 5 && (
                    <div className="text-sm text-gray-500 italic">
                      ... and {Object.keys(step.data).length - 5} more fields
                    </div>
                  )}
                </div>
              </div>
            )}

            {showRawData && (
              <pre className="p-4 bg-gray-900 text-green-400 text-xs rounded-lg overflow-x-auto">
                {JSON.stringify(step.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
