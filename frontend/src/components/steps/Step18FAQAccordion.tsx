/**
 * Step 18: FAQ Accordion Section (Two-Phase Hybrid)
 * Phase 1: User provides FAQ questions + answer hints
 * Phase 2: AI generates answers for user FAQs + 3 additional FAQs
 * Owner: Human + AI
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import AIOutputDisplay from '../shared/AIOutputDisplay';
import SuccessBanner from '../shared/SuccessBanner';
import ErrorBanner from '../shared/ErrorBanner';
import ProgressAnimation from '../shared/ProgressAnimation';
import StepNavigation from '../shared/StepNavigation';
import PromptDisplay from '../shared/PromptDisplay';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface FAQ {
  question: string;
  hints: string;
}

interface Step18Props {
  sessionId: string;
  initialData?: any;
}

export default function Step18FAQAccordion({ sessionId, initialData }: Step18Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState<any>(initialData || null);
  const [error, setError] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // Phase 1: User input state
  const [userFaqs, setUserFaqs] = useState<FAQ[]>([
    { question: '', hints: '' }
  ]);

  const handleAddFaq = () => {
    if (userFaqs.length >= 10) {
      alert('Maximum 10 FAQs allowed. You can add up to 10 FAQs, and AI will generate 3 more (total: 13 FAQs).');
      return;
    }
    setUserFaqs([...userFaqs, { question: '', hints: '' }]);
  };

  const handleRemoveFaq = (index: number) => {
    if (userFaqs.length > 1) {
      setUserFaqs(userFaqs.filter((_, i) => i !== index));
    }
  };

  const handleFaqChange = (index: number, field: 'question' | 'hints', value: string) => {
    const newFaqs = [...userFaqs];
    newFaqs[index][field] = value;
    setUserFaqs(newFaqs);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Filter out empty FAQs
      const validUserFaqs = userFaqs.filter(
        faq => faq.question.trim() && faq.hints.trim()
      );

      const result = await api.executeStep18FAQAccordion(
        sessionId,
        { user_faqs: validUserFaqs },
        token
      );

      if (result.success && result.data) {
        setStepData(result.data);
        setExecutionComplete(true);
      } else {
        setError(result.error || result.data?.error || 'Failed to generate FAQs');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSkip = async () => {
    const reason = prompt('Why are you skipping this step?');
    if (!reason) return;

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.skipStep(18, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const copyFAQHTML = () => {
    if (stepData?.faq_html) {
      navigator.clipboard.writeText(stepData.faq_html);
      alert('FAQ HTML copied to clipboard!');
    }
  };

  const getValidUserFaqCount = () => {
    return userFaqs.filter(faq => faq.question.trim() && faq.hints.trim()).length;
  };

  const renderPhase1Input = () => {
    const validCount = getValidUserFaqCount();

    return (
      <div className="space-y-6">
        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Phase 1 of 2: Provide FAQ Questions + Answer Hints</strong>
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Add FAQ questions and brief answer hints (optional - you can add 0 or more)</li>
            <li>AI will generate complete answers for your FAQs using your hints</li>
            <li>AI will also generate 3 additional complementary FAQs</li>
            <li>Total FAQs = Your FAQs (with AI-generated answers) + 3 AI FAQs</li>
          </ul>
        </div>

        {/* FAQ Input Fields */}
        <div className="space-y-4">
          {userFaqs.map((faq, index) => (
            <div
              key={index}
              className="p-5 bg-white border-2 border-gray-200 rounded-lg relative"
            >
              {/* Remove Button */}
              {userFaqs.length > 1 && (
                <button
                  onClick={() => handleRemoveFaq(index)}
                  className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-sm"
                >
                  ✕ Remove
                </button>
              )}

              <div className="text-sm font-semibold text-gray-700 mb-3">
                FAQ #{index + 1}
              </div>

              {/* Question */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                  placeholder="e.g., What is AI calling?"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Answer Hints */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Answer Hints/Points (AI will create polished answers) *
                </label>
                <textarea
                  value={faq.hints}
                  onChange={(e) => handleFaqChange(index, 'hints', e.target.value)}
                  placeholder="e.g., Mention Twilio API, ElevenLabs, latency considerations, cost per minute (~$0.01-0.05)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Provide brief hints/bullets - AI will expand them into a complete answer
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Add FAQ Button */}
        <button
          onClick={handleAddFaq}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          + Add Another FAQ
        </button>

        {/* Status Message */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              Your FAQs: <span className="font-bold text-blue-600">{validCount}</span>
            </span>
            <span className="text-sm text-gray-700">
              AI will generate: <span className="font-bold text-green-600">3 FAQs</span>
            </span>
            <span className="text-sm text-gray-700">
              Total: <span className="font-bold text-purple-600">{validCount + 3}</span>
            </span>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleExecute}
          disabled={isExecuting}
          className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
        >
          {isExecuting ? '⏳ Generating FAQ Answers...' : '✨ Generate FAQ Answers & 3 AI FAQs'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          You can add 0 or more FAQ questions with hints. AI will generate complete answers + 3 additional FAQs.
        </p>
      </div>
    );
  };

  const renderPhase2Results = () => {
    if (!stepData) return null;

    // Backward compatibility: Handle both old and new data formats
    const userFaqs = stepData.user_faqs || [];
    const aiFaqs = stepData.ai_faqs || [];
    const allFaqs = stepData.faqs || [];

    // For old sessions without source tags, compute counts from source field
    const userCount = stepData.user_count ?? allFaqs.filter((f: any) => f.source === 'user').length;
    const aiCount = stepData.ai_count ?? allFaqs.filter((f: any) => f.source === 'ai').length;
    const totalCount = stepData.total_count ?? allFaqs.length;

    return (
      <div className="space-y-6">
        {/* Success Banner */}
        <SuccessBanner
          stepNumber={18}
          stepName="FAQ Accordion"
          message={stepData.summary || 'FAQ section generated successfully'}
        />

        {/* LLM Prompt Display */}
        <PromptDisplay
          prompt={stepData?.llm_prompt}
          title="LLM Prompt Sent to OpenAI"
        />

        {/* Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-purple-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">❓</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  FAQ Accordion Complete
                </h3>
                <p className="text-sm text-gray-600">
                  {totalCount} total FAQs ({userCount} yours + {aiCount} AI)
                </p>
              </div>
            </div>
            {stepData.faq_html && (
              <button
                onClick={copyFAQHTML}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
              >
                Copy HTML
              </button>
            )}
          </div>
        </div>

        {/* Count Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-600">{userCount}</div>
            <div className="text-xs text-gray-600 mt-1">Your FAQs</div>
          </div>
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-600">{aiCount}</div>
            <div className="text-xs text-gray-600 mt-1">AI-Generated</div>
          </div>
          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg text-center">
            <div className="text-3xl font-bold text-purple-600">{totalCount}</div>
            <div className="text-xs text-gray-600 mt-1">Total FAQs</div>
          </div>
        </div>

        {/* FAQ Accordion */}
        {allFaqs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">
                Frequently Asked Questions
              </h4>
            </div>
            <div className="divide-y divide-gray-200">
              {allFaqs.map((faq: any, index: number) => {
                // Backward compatibility: handle FAQs without source field (old format)
                const isUserFaq = faq.source === 'user';
                const isLegacyFaq = !faq.source; // Old sessions don't have source field
                const badgeColor = isUserFaq
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : isLegacyFaq
                  ? 'bg-gray-100 text-gray-800 border-gray-300'
                  : 'bg-green-100 text-green-800 border-green-300';
                const badgeText = isUserFaq ? '👤 Your FAQ' : isLegacyFaq ? '📝 FAQ' : '🤖 AI-Generated';

                return (
                  <div
                    key={index}
                    className={`transition-colors ${
                      isUserFaq ? 'hover:bg-blue-50' : isLegacyFaq ? 'hover:bg-gray-50' : 'hover:bg-green-50'
                    }`}
                  >
                    {/* Question Header */}
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className={`text-lg font-medium mt-1 ${
                          isUserFaq ? 'text-blue-600' : isLegacyFaq ? 'text-gray-600' : 'text-green-600'
                        }`}>
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <div className="mb-2">
                            <span className={`text-xs px-2 py-1 rounded border ${badgeColor} font-medium`}>
                              {badgeText}
                            </span>
                          </div>
                          <h5 className="text-base font-semibold text-gray-900">
                            {faq.question}
                          </h5>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          expandedFAQ === index ? 'transform rotate-180' : ''
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
                    </button>

                    {/* Answer Content */}
                    {expandedFAQ === index && (
                      <div className="px-6 pb-4 pl-14">
                        <div className={`p-4 rounded border ${
                          isUserFaq
                            ? 'bg-blue-50 border-blue-200'
                            : isLegacyFaq
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-green-50 border-green-200'
                        }`}>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HTML Preview */}
        {stepData.faq_html && (
          <details className="bg-white border border-gray-200 rounded-lg">
            <summary className="px-6 py-4 cursor-pointer font-semibold text-gray-900 hover:bg-gray-50">
              View HTML Code
            </summary>
            <div className="px-6 pb-4">
              <pre className="p-4 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
                {stepData.faq_html}
              </pre>
            </div>
          </details>
        )}

        {/* Raw Data (Collapsible) */}
        <AIOutputDisplay title="FAQ Accordion Details" data={stepData} collapsible={true} />
      </div>
    );
  };

  return (
    <StepContainer
      stepNumber={18}
      stepName="FAQ Accordion (Two-Phase)"
      owner="AI+Human"
      description="You provide FAQ questions + hints, AI generates complete answers + 3 additional FAQs"
    >
      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={18}
          stepName="FAQ Accordion"
          estimatedSeconds={35}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={18}
          stepName="FAQ Accordion"
        />
      )}

      {/* Phase 1: User Input OR Phase 2: Results */}
      {!executionComplete && !isExecuting && renderPhase1Input()}
      {executionComplete && !isExecuting && stepData && renderPhase2Results()}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={18}
        isExecuting={isExecuting}
        canExecute={!executionComplete}
        canSkip={!executionComplete}
        onExecute={handleExecute}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
      />
    </StepContainer>
  );
}
