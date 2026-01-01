/**
 * Webinar Step Registry and Metadata
 * Defines all 15 webinar workflow steps and their properties
 */

import React from 'react';

// Step metadata interface
export interface WebinarStepMetadata {
  stepNumber: number;
  name: string;
  owner: 'AI' | 'Human';
  description: string;
  estimatedDuration: string;
  canSkip: boolean;
}

// Complete metadata for all 15 webinar steps
export const WEBINAR_STEP_METADATA: Record<number, WebinarStepMetadata> = {
  1: {
    stepNumber: 1,
    name: 'Webinar Topic Input',
    owner: 'Human',
    description: 'Enter webinar topic, guest information, and target audience',
    estimatedDuration: '2-3 minutes',
    canSkip: false
  },
  2: {
    stepNumber: 2,
    name: 'Competitor Content Fetch',
    owner: 'AI',
    description: 'Fetch competitor blogs using Tavily search',
    estimatedDuration: '30-45 seconds',
    canSkip: false
  },
  3: {
    stepNumber: 3,
    name: 'Competitor Analysis',
    owner: 'AI',
    description: 'Analyze competitor content for structure and style patterns',
    estimatedDuration: '45-60 seconds',
    canSkip: false
  },
  4: {
    stepNumber: 4,
    name: 'Webinar Transcript Input',
    owner: 'Human',
    description: 'Upload webinar/podcast transcript (min 500 words)',
    estimatedDuration: '3-5 minutes',
    canSkip: false
  },
  5: {
    stepNumber: 5,
    name: 'Content Guidelines Input',
    owner: 'Human',
    description: 'Specify what to emphasize, avoid, and tone preferences',
    estimatedDuration: '2-3 minutes',
    canSkip: true
  },
  6: {
    stepNumber: 6,
    name: 'Outline Generation',
    owner: 'AI',
    description: 'Generate blog outline from transcript and guidelines',
    estimatedDuration: '60-90 seconds',
    canSkip: false
  },
  7: {
    stepNumber: 7,
    name: 'LLM Optimization Planning',
    owner: 'AI',
    description: 'Identify glossary terms and "What is X?" sections',
    estimatedDuration: '30-45 seconds',
    canSkip: false
  },
  8: {
    stepNumber: 8,
    name: 'Landing Page Evaluation',
    owner: 'AI',
    description: 'Analyze for product/topic landing page opportunities',
    estimatedDuration: '30-45 seconds',
    canSkip: false
  },
  9: {
    stepNumber: 9,
    name: 'Infographic Planning',
    owner: 'AI',
    description: 'Identify data-heavy sections for infographics',
    estimatedDuration: '20-30 seconds',
    canSkip: false
  },
  10: {
    stepNumber: 10,
    name: 'Title Generation',
    owner: 'AI',
    description: 'Generate 3 SEO-optimized title options',
    estimatedDuration: '20-30 seconds',
    canSkip: false
  },
  11: {
    stepNumber: 11,
    name: 'Blog Draft Generation',
    owner: 'AI',
    description: 'Generate complete 2000+ word blog draft from transcript',
    estimatedDuration: '2-3 minutes',
    canSkip: false
  },
  12: {
    stepNumber: 12,
    name: 'Meta Description',
    owner: 'AI',
    description: 'Generate SEO-optimized meta description (140-160 chars)',
    estimatedDuration: '15-20 seconds',
    canSkip: false
  },
  13: {
    stepNumber: 13,
    name: 'AI Signal Removal',
    owner: 'AI',
    description: 'Remove AI-generated patterns and phrases',
    estimatedDuration: '45-60 seconds',
    canSkip: false
  },
  14: {
    stepNumber: 14,
    name: 'Export & Archive',
    owner: 'AI',
    description: 'Export final blog as markdown with metadata',
    estimatedDuration: '10-15 seconds',
    canSkip: false
  },
  15: {
    stepNumber: 15,
    name: 'Final Review Checklist',
    owner: 'Human',
    description: 'Review and approve final blog for publication',
    estimatedDuration: '5-10 minutes',
    canSkip: false
  }
};

// Import step components
import WebinarStep1Topic from './WebinarStep1Topic';
import WebinarStep2CompetitorFetch from './WebinarStep2CompetitorFetch';
import WebinarStep3CompetitorAnalysis from './WebinarStep3CompetitorAnalysis';
import WebinarStep4Transcript from './WebinarStep4Transcript';
import WebinarStep5Guidelines from './WebinarStep5Guidelines';
import WebinarStep6Outline from './WebinarStep6Outline';
import WebinarStep7LLMOptimization from './WebinarStep7LLMOptimization';
import WebinarStep8LandingPage from './WebinarStep8LandingPage';
import WebinarStep9Infographic from './WebinarStep9Infographic';
import WebinarStep10Title from './WebinarStep10Title';
import WebinarStep11Draft from './WebinarStep11Draft';
import WebinarStep12Meta from './WebinarStep12Meta';
import WebinarStep13AISignal from './WebinarStep13AISignal';
import WebinarStep14Export from './WebinarStep14Export';
import WebinarStep15Review from './WebinarStep15Review';

/**
 * Get step component by step number
 * This function will dynamically load the appropriate step component
 */
export function getWebinarStepComponent({ sessionId, stepNumber, initialData, onStepComplete }: {
  sessionId: string;
  stepNumber: number;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}) {
  // Dynamically load the appropriate step component

  switch (stepNumber) {
    case 1:
      return <WebinarStep1Topic sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 2:
      return <WebinarStep2CompetitorFetch sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 3:
      return <WebinarStep3CompetitorAnalysis sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 4:
      return <WebinarStep4Transcript sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 5:
      return <WebinarStep5Guidelines sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 6:
      return <WebinarStep6Outline sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 7:
      return <WebinarStep7LLMOptimization sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 8:
      return <WebinarStep8LandingPage sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 9:
      return <WebinarStep9Infographic sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 10:
      return <WebinarStep10Title sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 11:
      return <WebinarStep11Draft sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 12:
      return <WebinarStep12Meta sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 13:
      return <WebinarStep13AISignal sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 14:
      return <WebinarStep14Export sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    case 15:
      return <WebinarStep15Review sessionId={sessionId} initialData={initialData} onStepComplete={onStepComplete} />;
    default:
      return <div className="p-8 text-center text-red-600">Invalid step number: {stepNumber}</div>;
  }
}

/**
 * Get step metadata
 */
export function getWebinarStepMetadata(stepNumber: number): WebinarStepMetadata | undefined {
  return WEBINAR_STEP_METADATA[stepNumber];
}

/**
 * Get total number of webinar steps
 */
export const TOTAL_WEBINAR_STEPS = 15;

/**
 * Calculate webinar session progress percentage
 */
export function calculateWebinarProgress(currentStep: number, completedSteps: number[]): number {
  return Math.round((completedSteps.length / TOTAL_WEBINAR_STEPS) * 100);
}
