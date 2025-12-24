/**
 * Step 12: Credibility Elements
 * Human adds first-person experiences, facts, statistics, and quotes
 * Owner: Human
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Fact {
  fact: string;
  source: string;
}

interface Step12Props {
  sessionId: string;
  initialData?: any;
}

export default function Step12CredibilityElements({ sessionId, initialData }: Step12Props) {
  const [facts, setFacts] = useState<Fact[]>(
    initialData?.facts || Array(5).fill({ fact: '', source: '' })
  );
  const [experiences, setExperiences] = useState<string[]>(
    initialData?.experiences || ['', '', '']
  );
  const [quotes, setQuotes] = useState<string[]>(
    initialData?.quotes || ['']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [error, setError] = useState<string | null>(null);

  const handleFactChange = (index: number, field: 'fact' | 'source', value: string) => {
    const newFacts = [...facts];
    newFacts[index] = { ...newFacts[index], [field]: value };
    setFacts(newFacts);
  };

  const handleExperienceChange = (index: number, value: string) => {
    const newExperiences = [...experiences];
    newExperiences[index] = value;
    setExperiences(newExperiences);
  };

  const handleQuoteChange = (index: number, value: string) => {
    const newQuotes = [...quotes];
    newQuotes[index] = value;
    setQuotes(newQuotes);
  };

  const handleAddFact = () => {
    setFacts([...facts, { fact: '', source: '' }]);
  };

  const handleAddExperience = () => {
    setExperiences([...experiences, '']);
  };

  const handleAddQuote = () => {
    setQuotes([...quotes, '']);
  };

  const handleSubmit = async (proceedWithFewer: boolean = false) => {
    // Validation
    const validFacts = facts.filter(f => f.fact.trim() && f.source.trim());
    const validExperiences = experiences.filter(e => e.trim());
    const validQuotes = quotes.filter(q => q.trim());

    if (validFacts.length < 5 && !proceedWithFewer) {
      setError('Please provide at least 5 facts/statistics with sources, or use "Proceed with Fewer Inputs"');
      return;
    }

    if (validExperiences.length < 3 && !proceedWithFewer) {
      setError('Please provide at least 3 first-person experiences/recommendations, or use "Proceed with Fewer Inputs"');
      return;
    }

    // If proceeding with fewer, ask for reason
    let fewerInputsReason = '';
    if (proceedWithFewer) {
      const missingItems = [];
      if (validFacts.length < 5) missingItems.push(`${validFacts.length} facts (need 5)`);
      if (validExperiences.length < 3) missingItems.push(`${validExperiences.length} experiences (need 3)`);

      fewerInputsReason = prompt(
        `Why are you proceeding with fewer inputs? (Missing: ${missingItems.join(', ')})\n\ne.g., "Limited first-person experience with this specific topic"`
      ) || '';
      if (!fewerInputsReason) return; // User cancelled
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep12CredibilityElements(
        sessionId,
        {
          facts: validFacts,
          experiences: validExperiences,
          quotes: validQuotes
        },
        token,
        proceedWithFewer,
        fewerInputsReason
      );

      if (result.success) {
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to save credibility elements');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedWithFewer = () => {
    handleSubmit(true);
  };

  const handleSkip = async () => {
    const reason = prompt('Why are you skipping this step?');
    if (!reason) return;

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.skipStep(12, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    // Navigate back to dashboard
    window.location.href = '/creator/dashboard';
  };

  const validFactsCount = facts.filter(f => f.fact.trim() && f.source.trim()).length;
  const validExperiencesCount = experiences.filter(e => e.trim()).length;
  const hasMinimumInputs = validFactsCount >= 5 && validExperiencesCount >= 3;
  const hasAnyInputs = validFactsCount > 0 || validExperiencesCount > 0;

  return (
    <StepContainer
      stepNumber={12}
      stepName="Credibility Elements"
      owner="Human"
      description="Add personal experiences, facts, statistics, and expert quotes to enhance credibility"
    >
      {/* Instructions */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-gray-700 mb-2">
          <strong>Your Task:</strong> Add credibility elements to make the blog trustworthy and
          unique. Include facts/stats with sources, first-person experiences, and optional expert
          quotes.
        </p>
        <p className="text-xs text-gray-600">
          💡 Minimum: 5 facts + 3 experiences. Quotes are optional but recommended.
        </p>
      </div>

      {executionComplete ? (
        /* Completion State */
        <div className="space-y-6">
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">✓</span>
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  Step Completed
                </h3>
                <p className="text-sm text-green-700">
                  Credibility elements added successfully
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {initialData?.fact_count || 0}
                </div>
                <div className="text-xs text-gray-600">Facts/Stats</div>
              </div>
              <div className="p-3 bg-white rounded">
                <div className="text-2xl font-bold text-purple-600">
                  {initialData?.experience_count || 0}
                </div>
                <div className="text-xs text-gray-600">Experiences</div>
              </div>
              <div className="p-3 bg-white rounded">
                <div className="text-2xl font-bold text-green-600">
                  {initialData?.quote_count || 0}
                </div>
                <div className="text-xs text-gray-600">Quotes</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Input Form */
        <div className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Facts/Statistics Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">
                📊 Facts/Statistics (min. 5 required)
              </h4>
              <button
                onClick={handleAddFact}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Fact
              </button>
            </div>

            {facts.map((fact, index) => (
              <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Fact #{index + 1}
                </div>
                <textarea
                  value={fact.fact}
                  onChange={(e) => handleFactChange(index, 'fact', e.target.value)}
                  placeholder="e.g., 75% of marketers saw increased engagement after..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                />
                <input
                  type="url"
                  value={fact.source}
                  onChange={(e) => handleFactChange(index, 'source', e.target.value)}
                  placeholder="Source URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            ))}
          </div>

          {/* First-Person Experiences Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">
                ✍️ First-Person Experiences (min. 3 required)
              </h4>
              <button
                onClick={handleAddExperience}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                + Add Experience
              </button>
            </div>

            {experiences.map((experience, index) => (
              <div key={index} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Experience #{index + 1}
                </div>
                <textarea
                  value={experience}
                  onChange={(e) => handleExperienceChange(index, e.target.value)}
                  placeholder="e.g., In my experience working with clients, I've found that..."
                  rows={3}
                  className="w-full px-3 py-2 border border-purple-300 rounded"
                />
                <p className="text-xs text-purple-600 mt-1">
                  💡 Use first-person voice ("I found that...", "My team discovered...")
                </p>
              </div>
            ))}
          </div>

          {/* Expert Quotes Section (Optional) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">
                💬 Expert Quotes (optional)
              </h4>
              <button
                onClick={handleAddQuote}
                className="text-sm text-green-600 hover:text-green-800"
              >
                + Add Quote
              </button>
            </div>

            {quotes.map((quote, index) => (
              <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Quote #{index + 1}
                </div>
                <textarea
                  value={quote}
                  onChange={(e) => handleQuoteChange(index, e.target.value)}
                  placeholder='e.g., "The key to success is..." - Expert Name, Company'
                  rows={2}
                  className="w-full px-3 py-2 border border-green-300 rounded"
                />
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || !hasMinimumInputs}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Credibility Elements'}
            </button>

            {/* Proceed with Fewer Inputs Button (only show if less than minimum but has some inputs) */}
            {hasAnyInputs && !hasMinimumInputs && (
              <button
                onClick={handleProceedWithFewer}
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                title="Proceed with fewer inputs (requires justification)"
              >
                ⚠️ Proceed with {validFactsCount} {validFactsCount === 1 ? 'Fact' : 'Facts'} & {validExperiencesCount} {validExperiencesCount === 1 ? 'Experience' : 'Experiences'}
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            Required: 5+ facts with sources, 3+ first-person experiences • Optional: Expert quotes
          </p>
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={12}
        isExecuting={isSubmitting}
        canExecute={!executionComplete}
        canSkip={!executionComplete}
        onExecute={handleSubmit}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
      />
    </StepContainer>
  );
}
