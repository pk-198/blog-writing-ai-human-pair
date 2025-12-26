/**
 * API client for communicating with the FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';

interface LoginRequest {
  role: 'creator' | 'reviewer';
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
}

interface ApiError {
  detail: string;
}

interface SessionCreateRequest {
  primary_keyword: string;
  blog_type: string;
}

interface SessionResponse {
  session_id: string;
  created_at: string;
  current_step: number;
  status: string;
  primary_keyword: string;
  blog_type: string;
  schema_version?: number;
}

interface StepExecuteRequest {
  session_id: string;
  input_data?: any;
}

interface StepSkipRequest {
  session_id: string;
  reason: string;
}

interface StepResponse {
  success: boolean;
  step_number: number;
  step_name: string;
  data?: any;
  error?: string;
  duration_seconds?: number;
}

interface WorkflowStatusResponse {
  session_id: string;
  current_step: number;
  completed_steps: number[];
  pending_steps: number[];
  session_status: string;
  primary_keyword: string;
  created_at: string;
  updated_at: string;
}

interface SessionListItem {
  session_id: string;
  primary_keyword: string;
  blog_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  current_step: number;
  total_steps: number;
  progress_percentage: number;
  steps_completed: number;
  steps_skipped: number;
  schema_version?: number;  // 1 = old (Steps 21=Checklist, 22=Export), 2 = new (swapped)
}

interface PaginationInfo {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface SessionError {
  session_id: string;
  error: string;
}

interface SessionListResponse {
  sessions: SessionListItem[];
  pagination: PaginationInfo;
  errors: SessionError[];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Login with role and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    return response.json();
  }

  /**
   * Make authenticated request with JWT token
   */
  async authenticatedRequest(
    endpoint: string,
    token: string,
    options: RequestInit = {}
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a new blog session
   */
  async createSession(
    request: SessionCreateRequest,
    token: string
  ): Promise<SessionResponse> {
    const response = await this.authenticatedRequest(
      '/api/sessions/',
      token,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to create session');
    }

    return response.json();
  }

  /**
   * Get active session (if any)
   */
  async getActiveSession(token: string): Promise<any> {
    const response = await this.authenticatedRequest(
      '/api/sessions/active/current',
      token
    );

    if (!response.ok) {
      throw new Error('Failed to get active session');
    }

    return response.json();
  }

  /**
   * Get session state
   */
  async getSessionState(sessionId: string, token: string): Promise<any> {
    const response = await this.authenticatedRequest(
      `/api/sessions/${sessionId}`,
      token
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to get session state');
    }

    return response.json();
  }

  /**
   * Get workflow status for a session
   */
  async getWorkflowStatus(sessionId: string, token: string): Promise<WorkflowStatusResponse> {
    const response = await this.authenticatedRequest(
      `/api/steps/${sessionId}/status`,
      token
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to get workflow status');
    }

    return response.json();
  }

  /**
   * List all sessions with pagination (for Creator history view)
   */
  async listCreatorSessions(
    statusFilter?: string,
    page: number = 1,
    pageSize: number = 5,
    token?: string
  ): Promise<SessionListResponse> {
    const params = new URLSearchParams();
    if (statusFilter) {
      params.append('status_filter', statusFilter);
    }
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());

    const queryString = params.toString();
    const endpoint = `/api/sessions?${queryString}`;

    const response = await this.authenticatedRequest(endpoint, token || '');

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to list sessions');
    }

    return response.json();
  }

  /**
   * Execute a specific workflow step
   */
  async executeStep(
    stepNumber: number,
    request: StepExecuteRequest,
    token: string
  ): Promise<StepResponse> {
    const stepEndpoints: { [key: number]: string } = {
      1: '/api/steps/1/search-intent',
      2: '/api/steps/2/competitor-fetch',
      3: '/api/steps/3/competitor-analysis',
      4: '/api/steps/4/webinar-points',
      5: '/api/steps/5/secondary-keywords',
      6: '/api/steps/6/blog-clustering',
      7: '/api/steps/7/outline-generation',
      8: '/api/steps/8/llm-optimization',
      9: '/api/steps/9/data-collection',
      10: '/api/steps/10/tools-research',
      11: '/api/steps/11/resource-links',
      12: '/api/steps/12/credibility-elements',
      13: '/api/steps/13/business-info-update',
      14: '/api/steps/14/landing-page-eval',
      15: '/api/steps/15/infographic-planning',
      16: '/api/steps/16/title-creation',
      17: '/api/steps/17/blog-draft',
      18: '/api/steps/18/faq-accordion',
      19: '/api/steps/19/meta-description',
      20: '/api/steps/20/ai-signal-removal',
      21: '/api/steps/21/export-archive',
      22: '/api/steps/22/final-review',
    };

    const endpoint = stepEndpoints[stepNumber];
    if (!endpoint) {
      throw new Error(`Invalid step number: ${stepNumber}`);
    }

    const response = await this.authenticatedRequest(endpoint, token, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || `Failed to execute step ${stepNumber}`);
    }

    return response.json();
  }

  /**
   * Skip a step with reason
   */
  async skipStep(
    stepNumber: number,
    request: StepSkipRequest,
    token: string
  ): Promise<StepResponse> {
    const response = await this.authenticatedRequest(
      `/api/steps/skip?step_number=${stepNumber}`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || `Failed to skip step ${stepNumber}`);
    }

    return response.json();
  }

  /**
   * Update step data after human edits
   */
  async updateStepData(
    stepNumber: number,
    sessionId: string,
    updatedData: any,
    token: string
  ): Promise<StepResponse> {
    const response = await this.authenticatedRequest(
      `/api/steps/${stepNumber}/update`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          updated_data: updatedData
        }),
      }
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || `Failed to update step ${stepNumber}`);
    }

    return response.json();
  }

  // ============================================================================
  // CONVENIENCE METHODS FOR SPECIFIC STEPS
  // ============================================================================

  /**
   * Step 1: Search Intent Analysis
   */
  async executeStep1SearchIntent(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(1, { session_id: sessionId }, token);
  }

  /**
   * Step 2: Competitor Content Fetch
   */
  async executeStep2CompetitorFetch(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(2, { session_id: sessionId }, token);
  }

  /**
   * Step 2 Extension: Add Manual Competitor Content
   * Allows manual addition of competitor content after automated fetch
   */
  async addManualCompetitorContent(
    sessionId: string,
    manualCompetitors: Array<{ url: string; title: string; content: string }>,
    token: string
  ): Promise<any> {
    const response = await this.authenticatedRequest(
      '/api/steps/2/add-manual-content',
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          input_data: {
            manual_competitors: manualCompetitors
          }
        }),
      }
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to add manual competitor content');
    }

    return response.json();
  }

  /**
   * Step 3: Competitor Analysis
   */
  async executeStep3CompetitorAnalysis(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(3, { session_id: sessionId }, token);
  }

  /**
   * Step 4: Expert Opinion & Content Guidance (Two-Phase)
   * Phase 1: Collect expert opinion, writing style, transcript → Generate questions
   * Phase 2: Collect answers to generated questions
   */
  async executeStep4WebinarPoints(
    sessionId: string,
    inputData: any, // Phase 1 or Phase 2 data structure
    token: string
  ): Promise<StepResponse> {
    return this.executeStep(4, { session_id: sessionId, input_data: inputData }, token);
  }

  /**
   * Step 5: Secondary Keywords
   */
  async executeStep5SecondaryKeywords(
    sessionId: string,
    keywords: string[],
    token: string,
    proceedWithFewer: boolean = false,
    fewerInputsReason: string = ''
  ): Promise<StepResponse> {
    return this.executeStep(5, {
      session_id: sessionId,
      input_data: {
        keywords,
        proceed_with_fewer: proceedWithFewer,
        fewer_inputs_reason: fewerInputsReason
      }
    }, token);
  }

  /**
   * Step 6: Blog Clustering
   */
  async executeStep6BlogClustering(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(6, { session_id: sessionId }, token);
  }

  /**
   * Step 7: Outline Generation
   */
  async executeStep7OutlineGeneration(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(7, { session_id: sessionId }, token);
  }

  /**
   * Step 8: LLM Optimization Planning
   */
  async executeStep8LLMOptimization(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(8, { session_id: sessionId }, token);
  }

  /**
   * Step 9: Data Collection
   */
  async executeStep9DataCollection(
    sessionId: string,
    dataPoints: Array<{ statistic: string; source: string }>,
    token: string,
    proceedWithFewer: boolean = false,
    fewerInputsReason: string = '',
    action: string = 'collect',
    ideasCustomization: string = '',
    promptsCustomization: string = ''
  ): Promise<StepResponse> {
    return this.executeStep(9, {
      session_id: sessionId,
      input_data: {
        action,
        data_points: dataPoints,
        proceed_with_fewer: proceedWithFewer,
        fewer_inputs_reason: fewerInputsReason,
        ideas_customization: ideasCustomization,
        prompts_customization: promptsCustomization
      }
    }, token);
  }

  /**
   * Step 10: Tools Research
   */
  async executeStep10ToolsResearch(
    sessionId: string,
    tools: Array<{ name: string; features: string; url: string }>,
    token: string,
    proceedWithFewer: boolean = false,
    fewerInputsReason: string = '',
    action: string = 'collect',
    customization: string = ''
  ): Promise<StepResponse> {
    return this.executeStep(10, {
      session_id: sessionId,
      input_data: {
        action,
        tools,
        proceed_with_fewer: proceedWithFewer,
        fewer_inputs_reason: fewerInputsReason,
        customization
      }
    }, token);
  }

  /**
   * Step 11: Resource Links
   */
  async executeStep11ResourceLinks(
    sessionId: string,
    links: Array<{ title: string; url: string; description: string }>,
    token: string,
    proceedWithFewer: boolean = false,
    fewerInputsReason: string = ''
  ): Promise<StepResponse> {
    return this.executeStep(11, {
      session_id: sessionId,
      input_data: {
        links,
        proceed_with_fewer: proceedWithFewer,
        fewer_inputs_reason: fewerInputsReason
      }
    }, token);
  }

  /**
   * Step 12: Credibility Elements
   */
  async executeStep12CredibilityElements(
    sessionId: string,
    inputData: { experiences: string[], quotes: string[] },
    token: string,
    proceedWithFewer: boolean = false,
    fewerInputsReason: string = ''
  ): Promise<StepResponse> {
    return this.executeStep(12, {
      session_id: sessionId,
      input_data: {
        ...inputData,
        proceed_with_fewer: proceedWithFewer,
        fewer_inputs_reason: fewerInputsReason
      }
    }, token);
  }

  /**
   * Step 13: Business Info Update
   */
  async executeStep13BusinessInfo(
    sessionId: string,
    inputData: { new_info: string },
    token: string
  ): Promise<StepResponse> {
    return this.executeStep(13, {
      session_id: sessionId,
      input_data: inputData
    }, token);
  }

  /**
   * Save Business Info File (dograh.txt)
   * Used in Step 13 to update business context
   */
  async saveBusinessInfo(content: string, token: string): Promise<{ success: boolean; message: string; content: string; character_count: number }> {
    const response = await this.authenticatedRequest(
      '/api/steps/business-info',
      token,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to save business info');
    }

    return response.json();
  }

  /**
   * Step 14: Landing Page Evaluation
   */
  async executeStep14LandingPage(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(14, { session_id: sessionId }, token);
  }

  /**
   * Step 15: Infographic Planning
   */
  async executeStep15Infographic(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(15, { session_id: sessionId }, token);
  }

  /**
   * Step 16: Title Creation
   */
  async executeStep16TitleCreation(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(16, { session_id: sessionId }, token);
  }

  /**
   * Step 17: Blog Draft Generation
   */
  async executeStep17BlogDraft(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(17, { session_id: sessionId }, token);
  }

  /**
   * Step 18: FAQ Accordion (Two-Phase: User FAQs + AI FAQs)
   */
  async executeStep18FAQAccordion(sessionId: string, inputData: any, token: string): Promise<StepResponse> {
    return this.executeStep(18, { session_id: sessionId, input_data: inputData }, token);
  }

  /**
   * Step 19: Meta Description
   */
  async executeStep19MetaDescription(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(19, { session_id: sessionId }, token);
  }

  /**
   * Step 20: AI Signal Removal
   */
  async executeStep20AISignalRemoval(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(20, { session_id: sessionId }, token);
  }

  /**
   * Step 21: Export & Archive
   */
  async executeStep21ExportArchive(sessionId: string, token: string): Promise<StepResponse> {
    return this.executeStep(21, { session_id: sessionId }, token);
  }

  /**
   * Step 22: Final Review Checklist
   */
  async executeStep22FinalReview(
    sessionId: string,
    checklistItems: { [key: string]: boolean },
    feedback?: string,
    token?: string
  ): Promise<StepResponse> {
    return this.executeStep(22, {
      session_id: sessionId,
      input_data: { checklist_items: checklistItems, feedback }
    }, token!);
  }

  /**
   * Download exported blog markdown file for a session
   */
  async downloadBlog(sessionId: string, token: string): Promise<void> {
    const response = await this.authenticatedRequest(
      `/api/steps/${sessionId}/download-blog`,
      token,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to download blog');
    }

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'blog_export.md';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob from response and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // ============================================================================
  // REVIEWER METHODS
  // ============================================================================

  /**
   * List all blog sessions (for Reviewer dashboard)
   */
  async listAllSessions(statusFilter?: string, token?: string): Promise<{ sessions: any[] }> {
    const queryParams = statusFilter ? `?status_filter=${statusFilter}` : '';
    const response = await this.authenticatedRequest(
      `/api/reviewer/sessions${queryParams}`,
      token!
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to fetch sessions');
    }

    return response.json();
  }

  /**
   * Get complete workflow data for a session with plagiarism scores
   */
  async getSessionWorkflow(
    sessionId: string,
    includePlagiarism: boolean = true,
    token?: string
  ): Promise<any> {
    const queryParams = includePlagiarism ? '?include_plagiarism=true' : '?include_plagiarism=false';
    const response = await this.authenticatedRequest(
      `/api/reviewer/sessions/${sessionId}${queryParams}`,
      token!
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to fetch workflow data');
    }

    return response.json();
  }

  /**
   * Download blog export from reviewer interface
   */
  async downloadBlogFromReviewer(sessionId: string, token?: string): Promise<void> {
    const response = await this.authenticatedRequest(
      `/api/reviewer/sessions/${sessionId}/download`,
      token!,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to download blog');
    }

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'blog_export.md';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Create blob from response and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Get plagiarism database (all user inputs from past sessions)
   */
  async getPlagiarismDatabase(token?: string): Promise<any> {
    const response = await this.authenticatedRequest(
      `/api/reviewer/plagiarism/database`,
      token!
    );

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.detail || 'Failed to fetch plagiarism database');
    }

    return response.json();
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export types
export type {
  LoginRequest,
  LoginResponse,
  ApiError,
  SessionCreateRequest,
  SessionResponse,
  StepExecuteRequest,
  StepSkipRequest,
  StepResponse,
  WorkflowStatusResponse,
  SessionListItem,
  SessionListResponse,
  PaginationInfo,
  SessionError
};
