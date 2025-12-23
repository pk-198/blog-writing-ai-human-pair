/**
 * Step 21: Final Review Checklist
 * Human performs final review against comprehensive checklist
 * Owner: Human
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Step21Props {
  sessionId: string;
  initialData?: any;
}

const REVIEW_CHECKLIST = {
  content: [
    { id: 'word_count', label: 'Blog is 2000-3000 words' },
    { id: 'primary_keyword', label: 'Primary keyword appears in title and first paragraph' },
    { id: 'secondary_keywords', label: 'Secondary keywords naturally incorporated' },
    { id: 'short_paragraphs', label: 'Paragraphs are 2-3 lines max (mobile-friendly)' },
    { id: 'glossary', label: 'Glossary section included with 4-5 definitions' },
  ],
  seo: [
    { id: 'title_optimized', label: 'Title is ~55 characters with power word/emoji' },
    { id: 'meta_description', label: 'Meta description is 150-160 characters' },
    { id: 'headings_hierarchy', label: 'Proper H1/H2/H3 hierarchy maintained' },
    { id: 'internal_links', label: 'Internal links to related blog posts added' },
    { id: 'external_links', label: '5-7 external resource links included' },
  ],
  credibility: [
    { id: 'data_points', label: '4-5 data points with proper citations' },
    { id: 'first_person', label: 'First-person experiences included' },
    { id: 'tools_mentioned', label: '3-5 tools/platforms mentioned with links' },
    { id: 'expert_quotes', label: 'Expert quotes or webinar insights included (if applicable)' },
  ],
  quality: [
    { id: 'no_ai_signals', label: 'AI signals removed (no "delve", "landscape", etc.)' },
    { id: 'straight_quotes', label: 'All quotes are straight, not curly' },
    { id: 'opinion_present', label: 'Content includes opinion/bias (not neutral)' },
    { id: 'faq_included', label: 'FAQ section with 6-10 questions' },
    { id: 'no_repetition', label: 'No idea repetition across sections' },
  ],
};

export default function Step21FinalReview({ sessionId, initialData }: Step21Props) {
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>(
    initialData?.checklist_results || {}
  );
  const [notes, setNotes] = useState(initialData?.review_notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [error, setError] = useState<string | null>(null);

  const handleChecklistChange = (itemId: string, checked: boolean) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: checked,
    }));
  };

  const handleSubmit = async () => {
    // Validation - check if all items are checked
    const allItems = [
      ...REVIEW_CHECKLIST.content,
      ...REVIEW_CHECKLIST.seo,
      ...REVIEW_CHECKLIST.credibility,
      ...REVIEW_CHECKLIST.quality,
    ];

    const uncheckedItems = allItems.filter((item) => !checklist[item.id]);

    if (uncheckedItems.length > 0) {
      const proceed = confirm(
        `${uncheckedItems.length} checklist items are not checked. Are you sure you want to proceed?`
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep21FinalReview(
        sessionId,
        checklist,
        notes,
        token
      );

      if (result.success) {
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to save review');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
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

      await api.skipStep(21, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const calculateProgress = () => {
    const allItems = [
      ...REVIEW_CHECKLIST.content,
      ...REVIEW_CHECKLIST.seo,
      ...REVIEW_CHECKLIST.credibility,
      ...REVIEW_CHECKLIST.quality,
    ];
    const checkedCount = allItems.filter((item) => checklist[item.id]).length;
    return { checked: checkedCount, total: allItems.length };
  };

  const progress = calculateProgress();

  return (
    <StepContainer
      stepNumber={21}
      stepName="Final Review Checklist"
      owner="Human"
      description="Perform a comprehensive final review of the blog draft against quality, SEO, credibility, and content guidelines."
    >
      {/* Instructions */}
      {!executionComplete && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Your Task:</h3>
          <p className="text-green-800 text-sm mb-2">
            Review the blog draft carefully and check off each item in the checklist below.
            This ensures the blog meets all quality, SEO, and credibility standards before publication.
          </p>
          <p className="text-green-700 text-xs">
            Tip: Review the blog draft in Step 17 and make any necessary edits before completing this checklist.
          </p>
        </div>
      )}

      {/* Progress Bar */}
      {!executionComplete && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Review Progress
            </span>
            <span className="text-sm text-gray-600">
              {progress.checked}/{progress.total} items checked
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.checked / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist Form */}
      {!executionComplete && (
        <div className="space-y-6">
          {/* Content Quality */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">📝</span>
              Content Quality
            </h4>
            <div className="space-y-2">
              {REVIEW_CHECKLIST.content.map((item) => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={checklist[item.id] || false}
                    onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                    className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* SEO Optimization */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">🔍</span>
              SEO Optimization
            </h4>
            <div className="space-y-2">
              {REVIEW_CHECKLIST.seo.map((item) => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={checklist[item.id] || false}
                    onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                    className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Credibility Elements */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">⭐</span>
              Credibility Elements
            </h4>
            <div className="space-y-2">
              {REVIEW_CHECKLIST.credibility.map((item) => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={checklist[item.id] || false}
                    onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                    className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quality Checks */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-xl">✨</span>
              Quality Checks
            </h4>
            <div className="space-y-2">
              {REVIEW_CHECKLIST.quality.map((item) => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={checklist[item.id] || false}
                    onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                    className="mt-1 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Review Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any final notes, observations, or items that need attention..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? 'Saving Review...' : 'Complete Review & Continue'}
          </button>
        </div>
      )}

      {/* Completion State */}
      {executionComplete && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              Review Completed
            </h3>
            <p className="text-green-800 mb-4">
              Final review checklist completed. {progress.checked}/{progress.total} items checked.
            </p>
            {notes && (
              <div className="mt-3 p-3 bg-white rounded border border-green-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-1">Review Notes:</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={21}
        isExecuting={isSubmitting}
        canExecute={false}
        canSkip={!executionComplete}
        onExecute={() => {}}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
      />
    </StepContainer>
  );
}
