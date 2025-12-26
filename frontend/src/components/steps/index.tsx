/**
 * Step Components Index
 * Central registry for all 22 workflow step components
 */

import React from 'react';
import Step1SearchIntent from './Step1SearchIntent';
import Step2CompetitorFetch from './Step2CompetitorFetch';
import Step3CompetitorAnalysis from './Step3CompetitorAnalysis';
import Step4WebinarPoints from './Step4WebinarPoints';
import Step5SecondaryKeywords from './Step5SecondaryKeywords';
import Step6BlogClustering from './Step6BlogClustering';
import Step7OutlineGeneration from './Step7OutlineGeneration';
import Step8LLMOptimization from './Step8LLMOptimization';
import Step9DataCollection from './Step9DataCollection';
import Step10ToolsResearch from './Step10ToolsResearch';
import Step11ResourceLinks from './Step11ResourceLinks';
import Step12CredibilityElements from './Step12CredibilityElements';
import Step13BusinessInfo from './Step13BusinessInfo';
import Step14LandingPageEval from './Step14LandingPageEval';
import Step15InfographicPlanning from './Step15InfographicPlanning';
import Step16TitleCreation from './Step16TitleCreation';
import Step17BlogDraft from './Step17BlogDraft';
import Step18FAQAccordion from './Step18FAQAccordion';
import Step19MetaDescription from './Step19MetaDescription';
import Step20AISignalRemoval from './Step20AISignalRemoval';
import Step21ExportArchive from './Step21ExportArchive';
import Step22FinalReview from './Step22FinalReview';
import StepPlaceholder from './StepPlaceholder';

// Step metadata
export const STEP_METADATA = {
  1: { name: 'Search Intent Analysis', owner: 'AI' as const, description: 'AI analyzes SERP results to identify primary search intent' },
  2: { name: 'Competitor Content Fetch', owner: 'AI' as const, description: 'AI fetches selected competitor pages using Tavily API' },
  3: { name: 'Competitor Analysis', owner: 'AI' as const, description: 'AI analyzes competitor content to identify patterns' },
  4: { name: 'Expert Opinion/ QnA / Webinar/Podcast Points', owner: 'AI+Human' as const, description: 'Human uploads transcript, AI extracts key points' },
  5: { name: 'Secondary Keywords', owner: 'Human' as const, description: 'Human researches and adds 8-12 secondary keywords' },
  6: { name: 'Blog Clustering', owner: 'AI' as const, description: 'AI suggests blog clustering opportunities' },
  7: { name: 'Outline Generation', owner: 'AI' as const, description: 'AI creates comprehensive blog outline' },
  8: { name: 'LLM Optimization Planning', owner: 'AI' as const, description: 'AI marks sections for LLM/GEO optimization' },
  9: { name: 'Data Collection', owner: 'Human' as const, description: 'Human collects 4-5 data points with sources' },
  10: { name: 'Tools Research', owner: 'Human' as const, description: 'Human researches 3-5 tools/platforms to mention' },
  11: { name: 'Resource Links', owner: 'Human' as const, description: 'Human adds 5-7 external resource links' },
  12: { name: 'Credibility Elements', owner: 'Human' as const, description: 'Human adds first-person experiences' },
  13: { name: 'Business Info Update', owner: 'Human' as const, description: 'Human updates business context if needed' },
  14: { name: 'Landing Page Evaluation', owner: 'AI' as const, description: 'AI suggests landing page opportunities' },
  15: { name: 'Infographic Planning', owner: 'AI' as const, description: 'AI suggests 2 infographic ideas' },
  16: { name: 'Title Creation', owner: 'AI' as const, description: 'AI generates 3 SEO-optimized title options' },
  17: { name: 'Blog Draft Generation', owner: 'AI' as const, description: 'AI writes complete 2000-3000 word blog draft' },
  18: { name: 'FAQ Accordion', owner: 'AI' as const, description: 'AI generates 6-10 FAQs' },
  19: { name: 'Meta Description', owner: 'AI' as const, description: 'AI creates 150-160 character meta description' },
  20: { name: 'AI Signal Removal', owner: 'AI' as const, description: 'AI removes AI-written signals from content' },
  21: { name: 'Export & Archive', owner: 'AI' as const, description: 'AI exports final blog, saves to plagiarism DB, marks session complete' },
  22: { name: 'Final Review Checklist', owner: 'Human' as const, description: 'Reference checklist for post-export editing and uploading' },
};

interface StepComponentProps {
  sessionId: string;
  stepNumber: number;
  initialData?: any;
  schemaVersion?: number;  // Session schema version for backward compatibility
}

/**
 * Get the appropriate step component for a given step number
 */
export function getStepComponent({ sessionId, stepNumber, initialData, schemaVersion }: StepComponentProps) {
  const metadata = STEP_METADATA[stepNumber as keyof typeof STEP_METADATA];

  if (!metadata) {
    return <div>Invalid step number: {stepNumber}</div>;
  }

  // Map step numbers to their components
  switch (stepNumber) {
    case 1:
      return <Step1SearchIntent sessionId={sessionId} initialData={initialData} />;

    case 2:
      return <Step2CompetitorFetch sessionId={sessionId} initialData={initialData} />;

    case 3:
      return <Step3CompetitorAnalysis sessionId={sessionId} initialData={initialData} />;

    case 4:
      return <Step4WebinarPoints sessionId={sessionId} initialData={initialData} />;

    case 5:
      return <Step5SecondaryKeywords sessionId={sessionId} initialData={initialData} />;

    case 6:
      return <Step6BlogClustering sessionId={sessionId} initialData={initialData} />;

    case 7:
      return <Step7OutlineGeneration sessionId={sessionId} initialData={initialData} />;

    case 8:
      return <Step8LLMOptimization sessionId={sessionId} initialData={initialData} />;

    case 9:
      return <Step9DataCollection sessionId={sessionId} initialData={initialData} />;

    case 10:
      return <Step10ToolsResearch sessionId={sessionId} initialData={initialData} />;

    case 11:
      return <Step11ResourceLinks sessionId={sessionId} initialData={initialData} />;

    case 12:
      return <Step12CredibilityElements sessionId={sessionId} initialData={initialData} />;

    case 13:
      return <Step13BusinessInfo sessionId={sessionId} initialData={initialData} />;

    case 14:
      return <Step14LandingPageEval sessionId={sessionId} initialData={initialData} />;

    case 15:
      return <Step15InfographicPlanning sessionId={sessionId} initialData={initialData} />;

    case 16:
      return <Step16TitleCreation sessionId={sessionId} initialData={initialData} />;

    case 17:
      return <Step17BlogDraft sessionId={sessionId} initialData={initialData} />;

    case 18:
      return <Step18FAQAccordion sessionId={sessionId} initialData={initialData} />;

    case 19:
      return <Step19MetaDescription sessionId={sessionId} initialData={initialData} />;

    case 20:
      return <Step20AISignalRemoval sessionId={sessionId} initialData={initialData} />;

    case 21:
      // For old sessions (schema v1), hide this step
      if (!schemaVersion || schemaVersion < 2) {
        return (
          <StepPlaceholder
            sessionId={sessionId}
            stepNumber={21}
            stepName="Step Not Available"
            owner="AI"
            description="This step is not available for sessions created before the Step 21/22 swap. Your workflow ends at Step 20."
            initialData={null}
          />
        );
      }
      return <Step21ExportArchive sessionId={sessionId} initialData={initialData} />;

    case 22:
      // For old sessions (schema v1), hide this step
      if (!schemaVersion || schemaVersion < 2) {
        return (
          <StepPlaceholder
            sessionId={sessionId}
            stepNumber={22}
            stepName="Step Not Available"
            owner="Human"
            description="This step is not available for sessions created before the Step 21/22 swap. Your workflow ends at Step 20."
            initialData={null}
          />
        );
      }
      return <Step22FinalReview sessionId={sessionId} initialData={initialData} />;

    default:
      // Fallback for invalid step numbers
      return (
        <StepPlaceholder
          sessionId={sessionId}
          stepNumber={stepNumber}
          stepName={metadata.name}
          owner={metadata.owner}
          description={metadata.description}
          initialData={initialData}
        />
      );
  }
}

// Export individual components for direct use if needed
export {
  Step1SearchIntent,
  Step2CompetitorFetch,
  Step3CompetitorAnalysis,
  Step4WebinarPoints,
  Step5SecondaryKeywords,
  Step6BlogClustering,
  Step7OutlineGeneration,
  Step8LLMOptimization,
  Step9DataCollection,
  Step10ToolsResearch,
  Step11ResourceLinks,
  Step12CredibilityElements,
  Step13BusinessInfo,
  Step14LandingPageEval,
  Step15InfographicPlanning,
  Step16TitleCreation,
  Step17BlogDraft,
  Step18FAQAccordion,
  Step19MetaDescription,
  Step20AISignalRemoval,
  Step21ExportArchive,
  Step22FinalReview,
  StepPlaceholder
};
