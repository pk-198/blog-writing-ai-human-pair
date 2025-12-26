/**
 * Step 4: Expert Opinion & Content Guidance - TWO PHASES
 * Phase 1: Human provides expert opinion, writing style, optional transcript
 * Phase 2: AI generates 3 contextual questions, human answers them
 * Owner: Human Input + AI
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

interface Step4Props {
  sessionId: string;
  initialData?: any;
}

export default function Step4WebinarPoints({ sessionId, initialData }: Step4Props) {
  // Phase tracking
  const [currentPhase, setCurrentPhase] = useState(
    initialData?.phase === 'completed' ? 'completed' :
    initialData?.phase === 'phase1_complete' ? 'phase2' :
    'phase1'
  );

  // Phase 1 inputs
  const [expertOpinion, setExpertOpinion] = useState(initialData?.expert_opinion || '');
  const [writingStyle, setWritingStyle] = useState(initialData?.writing_style || '');
  const [transcript, setTranscript] = useState(initialData?.transcript || '');
  const [guestName, setGuestName] = useState(initialData?.guest_info?.name || '');
  const [guestRole, setGuestRole] = useState(initialData?.guest_info?.role || '');

  // Phase 2 - AI-generated questions and answers
  const [questions, setQuestions] = useState(initialData?.questions || []);
  const [answers, setAnswers] = useState(
    initialData?.question_answers || [{ answer: '' }, { answer: '' }, { answer: '' }]
  );

  const [isExecuting, setIsExecuting] = useState(false);
  const [stepData, setStepData] = useState(initialData || null);
  const [error, setError] = useState<string | null>(null);

  const handlePhase1Submit = async () => {
    // Validation
    if (!expertOpinion.trim()) {
      setError('Please provide your expert opinion');
      return;
    }

    // If transcript is provided, require guest details
    if (transcript.trim() && (!guestName.trim() || !guestRole.trim())) {
      setError('Please provide guest name and role for the transcript');
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep4WebinarPoints(
        sessionId,
        {
          phase: 'phase1',
          expert_opinion: expertOpinion.trim(),
          writing_style: writingStyle.trim(),
          transcript: transcript.trim(),
          guest_info: {
            name: guestName.trim(),
            role: guestRole.trim()
          }
        },
        token
      );

      if (result.success) {
        const data = result.data;
        setStepData(data);
        setQuestions(data.questions || []);
        setCurrentPhase('phase2');
      } else {
        setError(result.error || 'Phase 1 failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePhase2Submit = async () => {
    // Validation - ensure all 3 questions are answered
    const unanswered = answers.filter((a: any) => !a.answer.trim());
    if (unanswered.length > 0) {
      setError(`Please answer all ${questions.length} questions`);
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep4WebinarPoints(
        sessionId,
        {
          phase: 'phase2',
          question_answers: answers
        },
        token
      );

      if (result.success) {
        setStepData(result.data);
        setCurrentPhase('completed');
      } else {
        setError(result.error || 'Phase 2 failed');
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

      await api.skipStep(4, { session_id: sessionId, reason }, token);
      setCurrentPhase('completed');
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  return (
    <StepContainer
      stepNumber={4}
      stepName="Expert Opinion & Content Guidance"
      owner="AI+Human"
      description="Two-phase process: (1) Share your expertise, writing style, and optional transcript. (2) Answer 3 AI-generated contextual questions to make the blog 10x better."
    >
      {/* PHASE 1: Expert Opinion Collection */}
      {currentPhase === 'phase1' && !isExecuting && (
        <div className="space-y-6">
          {/* Instructions */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">📝 Phase 1 of 2: Share Your Expertise</h3>
            <ul className="list-disc list-inside text-purple-800 space-y-1 text-sm">
              <li><strong>Expert Opinion (Required):</strong> Your deep domain knowledge, latest insights, real-world examples</li>
              <li><strong>Writing Style (Optional):</strong> How you want the blog written - tone, structure, approach</li>
              <li><strong>Expert Opinion/ QnA / Webinar/Podcast Points (Optional):</strong> If based on a recording, paste transcript with guest details</li>
              <li className="text-purple-900 font-semibold mt-2">After submission, AI will generate 3 contextual questions for you to answer</li>
            </ul>
          </div>

          {/* Expert Opinion - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expert Opinion & Domain Knowledge * <span className="text-red-500">(Required)</span>
            </label>
            <textarea
              value={expertOpinion}
              onChange={(e) => setExpertOpinion(e.target.value)}
              placeholder="Share your expert insights, domain knowledge, latest trends, real-world examples, unique perspectives, and authentic experiences. Be specific and detailed - this is what will make your content stand out from generic AI content.

Examples:
- Latest industry trends you've observed
- Real-world case studies from your experience
- Common mistakes people make (that you've seen)
- Actionable advice based on your expertise
- Fresh data or insights not widely known
- Your unique take on the topic"
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
            />
            <p className="text-xs text-gray-500 mt-1">
              Character count: {expertOpinion.length}
            </p>
          </div>

          {/* Writing Style - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Writing Style Preference (Optional)
            </label>
            <textarea
              value={writingStyle}
              onChange={(e) => setWritingStyle(e.target.value)}
              placeholder="Describe your preferred writing style:
- Tone: Professional, casual, conversational, technical, etc.
- Structure: Short paragraphs, bullet points, narratives, etc.
- Approach: Data-driven, story-based, problem-solution, etc.
- Voice: First-person experiences, third-person analysis, etc.

Example: 'Use a conversational tone with short 2-3 sentence paragraphs. Include lots of bullet points and real-world examples. Write in first-person when sharing experiences.'"
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
            />
            <p className="text-xs text-gray-500 mt-1">
              Character count: {writingStyle.length}
            </p>
          </div>

          {/* Transcript - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expert Opinion/ QnA / Webinar/Podcast Transcript (Optional)
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="If this blog is based on a webinar, podcast, or recorded conversation, paste the full transcript here. AI will extract key talking points, quotes, and actionable advice."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
            />
            <p className="text-xs text-gray-500 mt-1">
              Character count: {transcript.length}
            </p>
          </div>

          {/* Guest Info - Required if transcript provided */}
          {transcript.trim() && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Name * <span className="text-red-500">(Required for transcript)</span>
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g., John Smith"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Role/Title * <span className="text-red-500">(Required for transcript)</span>
                </label>
                <input
                  type="text"
                  value={guestRole}
                  onChange={(e) => setGuestRole(e.target.value)}
                  placeholder="e.g., CEO at Company X"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Submit Phase 1 Button */}
          <button
            onClick={handlePhase1Submit}
            disabled={!expertOpinion.trim()}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit & Generate Contextual Questions →
          </button>
        </div>
      )}

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={4}
          stepName={currentPhase === 'phase1' ? 'Generating Questions' : 'Saving Answers'}
          estimatedSeconds={currentPhase === 'phase1' ? 45 : 15}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={currentPhase === 'phase1' ? handlePhase1Submit : handlePhase2Submit}
          stepNumber={4}
          stepName="Expert Opinion & Guidance"
        />
      )}

      {/* PHASE 2: Answer Contextual Questions */}
      {currentPhase === 'phase2' && !isExecuting && (
        <div className="space-y-6">
          {/* Phase 2 Instructions */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">🤖 Phase 2 of 2: Answer Contextual Questions</h3>
            <p className="text-green-800 text-sm">
              Based on your expertise and business context, AI has generated {questions.length} specific questions to make this blog 10x better.
              Please answer each question with as much detail as possible.
            </p>
          </div>

          {/* Questions List */}
          {questions.map((q: any, index: number) => (
            <div key={index} className="p-6 bg-white border-2 border-indigo-200 rounded-lg shadow-sm">
              <div className="mb-4">
                <div className="flex items-start gap-3 mb-2">
                  <span className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {q.question}
                    </h4>
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Why this matters:</strong> {q.rationale}
                    </div>
                    {q.example_answer && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                        <strong>Example answer:</strong> {q.example_answer}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <textarea
                value={answers[index]?.answer || ''}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[index] = { answer: e.target.value };
                  setAnswers(newAnswers);
                }}
                placeholder={`Your answer to question ${index + 1}...`}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
              />
              <p className="text-xs text-gray-500 mt-1">
                Character count: {answers[index]?.answer?.length || 0}
              </p>
            </div>
          ))}

          {/* Submit Phase 2 Button */}
          <button
            onClick={handlePhase2Submit}
            disabled={answers.some((a: any) => !a.answer?.trim())}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete Step 4 & Continue →
          </button>
        </div>
      )}

      {/* COMPLETED State */}
      {currentPhase === 'completed' && !isExecuting && stepData && (
        <div className="space-y-6">
          <SuccessBanner
            stepNumber={4}
            stepName="Expert Opinion & Content Guidance"
            message="Both phases completed! Your expertise and contextual answers will enhance the entire blog."
          />

          {/* LLM Prompt Display */}
          <PromptDisplay
            prompt={stepData?.llm_prompt}
            title="LLM Prompt Sent to OpenAI"
          />

          {/* Summary */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">✅</div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  Expert Guidance Captured
                </h3>
                <p className="text-gray-700">
                  {stepData.summary}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-white rounded-lg">
                <div className="text-sm text-gray-600">Expert Opinion</div>
                <div className="font-semibold text-gray-900">
                  {stepData.has_expert_input ? '✓ Provided' : '✗ Not provided'}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <div className="text-sm text-gray-600">Writing Style</div>
                <div className="font-semibold text-gray-900">
                  {stepData.writing_style ? '✓ Specified' : '✗ Not specified'}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <div className="text-sm text-gray-600">Transcript</div>
                <div className="font-semibold text-gray-900">
                  {stepData.has_transcript ? `✓ ${stepData.talking_points?.length || 0} points` : '✗ No transcript'}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <div className="text-sm text-gray-600">Contextual Q&A</div>
                <div className="font-semibold text-gray-900">
                  {stepData.has_contextual_qa ? `✓ ${stepData.question_answers?.length || 0} answers` : '✗ Not answered'}
                </div>
              </div>
            </div>
          </div>

          {/* Questions & Answers Display */}
          {stepData.has_contextual_qa && stepData.questions && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 text-lg">Contextual Questions & Answers:</h4>
              {stepData.questions.map((q: any, index: number) => (
                <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">{q.question}</div>
                      <div className="text-sm text-gray-700 bg-white p-3 rounded border border-blue-200">
                        <strong>Your Answer:</strong> {stepData.question_answers[index]?.answer}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full Data */}
          <AIOutputDisplay
            title="Complete Expert Guidance Data (JSON)"
            data={stepData}
            format="json"
            collapsible={true}
          />
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={4}
        isExecuting={isExecuting}
        canExecute={false}
        canSkip={currentPhase === 'phase1'}
        onExecute={() => {}}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={currentPhase === 'completed'}
      />
    </StepContainer>
  );
}
