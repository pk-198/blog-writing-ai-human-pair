/**
 * Step 18: FAQ Accordion Section
 * AI generates 6-10 FAQs based on "People Also Ask" patterns
 * Owner: AI
 */

'use client';

import React, { useState, useEffect } from 'react';
import StepContainer from '../shared/StepContainer';
import AIOutputDisplay from '../shared/AIOutputDisplay';
import SuccessBanner from '../shared/SuccessBanner';
import ErrorBanner from '../shared/ErrorBanner';
import ProgressAnimation from '../shared/ProgressAnimation';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

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

  useEffect(() => {
    // Auto-execute on mount if not already executed
    if (!initialData && !isExecuting && !executionComplete) {
      handleExecute();
    }
  }, []);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep18FAQAccordion(sessionId, token);

      if (result.success && result.data) {
        setStepData(result.data);
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to generate FAQs');
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
    // Navigate back to dashboard
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

  const renderFAQs = () => {
    if (!stepData) return null;

    const faqs = stepData.faqs || [];

    return (
      <div className="space-y-6">
        {/* Overview */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-300 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">❓</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  FAQ Accordion Generated
                </h3>
                <p className="text-sm text-gray-600">
                  {stepData.count || faqs.length} questions answered
                </p>
              </div>
            </div>
            {stepData.faq_html && (
              <button
                onClick={copyFAQHTML}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Copy HTML
              </button>
            )}
          </div>
        </div>

        {/* FAQ Accordion */}
        {faqs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">
                Frequently Asked Questions
              </h4>
            </div>
            <div className="divide-y divide-gray-200">
              {faqs.map((faq: any, index: number) => (
                <div key={index} className="transition-colors hover:bg-gray-50">
                  {/* Question Header */}
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-lg font-medium text-green-600 mt-1">
                        {index + 1}.
                      </span>
                      <h5 className="text-base font-semibold text-gray-900 flex-1">
                        {faq.question}
                      </h5>
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
                      <div className="p-4 bg-green-50 rounded border border-green-200">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {faqs.length === 0 && (
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-gray-600">
              No FAQs generated. This is unexpected - please retry.
            </p>
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

        {/* Summary */}
        {stepData.summary && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-900 font-medium">{stepData.summary}</span>
            </div>
          </div>
        )}

        {/* Raw Data (Collapsible) */}
        <AIOutputDisplay title="FAQ Accordion Details" data={stepData} collapsible={true} />
      </div>
    );
  };

  return (
    <StepContainer
      stepNumber={18}
      stepName="FAQ Accordion"
      owner="AI"
      description="AI generates 6-10 frequently asked questions with answers based on blog content"
    >
      {/* Instructions */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>AI Task:</strong> Generate 6-10 relevant FAQs based on the blog content,
          secondary keywords, and "People Also Ask" patterns. Format as HTML accordion.
        </p>
      </div>

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

      {/* Results */}
      {executionComplete && !isExecuting && stepData && (
        <div className="space-y-6">
          <SuccessBanner
            stepNumber={18}
            stepName="FAQ Accordion"
            message="Generated FAQ section with common questions and answers"
          />
          {renderFAQs()}
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={18}
        isExecuting={isExecuting}
        canExecute={!executionComplete}
        canSkip={false}
        onExecute={handleExecute}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
      />
    </StepContainer>
  );
}
