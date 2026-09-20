export interface ErrorCodeDetail {
  code: number;
  name: string;
  category: 'Client Error (4xx)' | 'Server Error (5xx)' | 'Network / Connectivity';
  summary: string;
  badgeColor: string;
  accentGradient: string;
  glowColor: string;
  probableCauses: string[];
  troubleshootingSteps: string[];
  recommendedAction: {
    label: string;
    href?: string;
    isRetry?: boolean;
  };
}

export const ERROR_CODES_REGISTRY: Record<number, ErrorCodeDetail> = {
  400: {
    code: 400,
    name: 'Bad Request',
    category: 'Client Error (4xx)',
    summary: 'The portal server could not interpret the request due to malformed syntax, corrupted parameters, or an invalid question payload.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentGradient: 'from-amber-500 via-orange-600 to-rose-600',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    probableCauses: [
      'The exam submission payload contained invalid JSON or unexpected schema values.',
      'Browser localStorage or cached session cookies became partially corrupted.',
      'An automated script or browser extension modified request headers unexpectedly.',
      'A mandatory parameter (such as candidate token or question ID) was missing.',
    ],
    troubleshootingSteps: [
      'Clear your browser cache and cookies for this domain, then sign in again.',
      'Disable aggressive browser ad-blockers or privacy extensions that might alter outgoing POST payloads.',
      'Reload the assessment page to synchronize fresh request tokens.',
    ],
    recommendedAction: { label: 'Reload Page', isRetry: true },
  },
  401: {
    code: 401,
    name: 'Unauthorized',
    category: 'Client Error (4xx)',
    summary: 'Authentication is required and has failed or has expired. You must present valid credentials to access this protected area.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    accentGradient: 'from-rose-500 via-pink-600 to-red-600',
    glowColor: 'rgba(244, 63, 94, 0.25)',
    probableCauses: [
      'Your authentication session has timed out after inactivity.',
      'You logged out from another browser tab or your bcrypt token was invalidated.',
      'The portal storage version was upgraded to purge legacy demo sessions.',
      'Attempted to access candidate or administrative endpoints without signing in.',
    ],
    troubleshootingSteps: [
      'Return to the login screen and authenticate with your email and password.',
      'Ensure third-party cookies or sessionStorage are not blocked in your browser privacy settings.',
      'Check that your system clock is accurate, as time drift can invalidate secure session tokens.',
    ],
    recommendedAction: { label: 'Sign In Again', href: '/' },
  },
  403: {
    code: 403,
    name: 'Access Forbidden',
    category: 'Client Error (4xx)',
    summary: 'Your identity is authenticated, but your account lacks the necessary permissions or role privileges for this resource.',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    accentGradient: 'from-red-600 via-rose-700 to-slate-900',
    glowColor: 'rgba(239, 68, 68, 0.25)',
    probableCauses: [
      'Developer Root Restriction: Only the Developer Administrator can provision other administrators. Standard admins cannot add new admins.',
      'Restricted Test Access: The assessment is assigned to specific student IDs, and your candidate ID is not enrolled in this roster.',
      'Candidate Accessing Admin Console: A student account attempted to directly access the administrative dashboard.',
      'Assessment Window Locked: The scheduled date and time window for this exam has either not opened yet or has already closed.',
    ],
    troubleshootingSteps: [
      'If you are a student, confirm with your examiner that your Student ID is assigned to this test.',
      'If you are an administrator, note that only the primary Developer Administrator possesses admin provisioning rights.',
      'Check the exam schedule tab to verify the active start and conclusion window.',
    ],
    recommendedAction: { label: 'Return to Portal', href: '/' },
  },
  404: {
    code: 404,
    name: 'Resource Not Found',
    category: 'Client Error (4xx)',
    summary: 'The portal server cannot find the requested test, candidate session, evaluation result, or endpoint path.',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    accentGradient: 'from-indigo-600 via-violet-600 to-purple-700',
    glowColor: 'rgba(99, 102, 241, 0.25)',
    probableCauses: [
      'The test ID specified in the URL does not exist or has been archived/deleted by an administrator.',
      'A typographical error exists in the URL path or exam session identifier.',
      'The evaluation report you are trying to view was cleared during a system demo reset.',
      'The requested dynamic API route is unmapped or disabled in current configuration.',
    ],
    troubleshootingSteps: [
      'Check the URL for spelling mistakes, stray characters, or incomplete test UUIDs.',
      'Navigate back to your dashboard to choose from currently active assessments.',
      'Contact your test administrator if you followed an official email invitation link.',
    ],
    recommendedAction: { label: 'Back to Dashboard', href: '/' },
  },
  408: {
    code: 408,
    name: 'Request Timeout',
    category: 'Network / Connectivity',
    summary: 'The server waited for the client request to complete, but the candidate device connection timed out before the transfer finished.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentGradient: 'from-amber-600 via-yellow-600 to-orange-700',
    glowColor: 'rgba(217, 119, 6, 0.25)',
    probableCauses: [
      'Intermittent Wi-Fi or mobile data drop occurred while submitting an exam question or test paper.',
      'Candidate uplink packet loss or extremely high jitter during media/proctoring transmission.',
      'The local device went into sleep or low-power mode while a long HTTP transfer was pending.',
      'Firewall or institutional proxy throttled long-lived keep-alive connections.',
    ],
    troubleshootingSteps: [
      'Verify your Wi-Fi or Ethernet cable connection and ensure signal strength is strong.',
      'Do not close this tab: the assessment engine preserves your draft answers in localStorage.',
      'Click Retry to re-transmit the saved payload immediately.',
    ],
    recommendedAction: { label: 'Retry Submission', isRetry: true },
  },
  429: {
    code: 429,
    name: 'Too Many Requests',
    category: 'Client Error (4xx)',
    summary: 'Anti-tamper rate limit triggered. The client sent too many rapid requests in a short time window.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accentGradient: 'from-purple-600 via-fuchsia-600 to-pink-600',
    glowColor: 'rgba(168, 85, 247, 0.25)',
    probableCauses: [
      'Rapid-fire clicking on submission or option buttons triggered portal anti-automation defense.',
      'Multiple failed authentication attempts triggered brute-force threshold lockout.',
      'AI question generator was called repeatedly before previous prompts completed.',
      'Candidate ran multiple test sessions simultaneously across several browser tabs.',
    ],
    troubleshootingSteps: [
      'Wait approximately 30 to 60 seconds before making another request.',
      'Ensure only one browser tab is actively running the test portal.',
      'Refrain from rapid multiple clicks while the system processes complex AI requests.',
    ],
    recommendedAction: { label: 'Wait and Retry', isRetry: true },
  },
  500: {
    code: 500,
    name: 'Internal Server Error',
    category: 'Server Error (5xx)',
    summary: 'An unexpected condition was encountered on the portal server that prevented it from fulfilling the operation.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    accentGradient: 'from-rose-600 via-red-600 to-orange-700',
    glowColor: 'rgba(225, 29, 72, 0.25)',
    probableCauses: [
      'An unhandled exception occurred in the server evaluation or score computation algorithm.',
      'A server-side schema mismatch occurred while saving student test attempts.',
      'Environment variables or backend runtime configuration encountered an initialization issue.',
      'File system or backend storage quota was temporarily locked or unavailable.',
    ],
    troubleshootingSteps: [
      'Reload the page after a few moments: transient execution faults often resolve automatically.',
      'Check the developer console or application logs for specific error stack traces.',
      'If the issue persists, inform the technical administrator with the diagnostic Correlation ID below.',
    ],
    recommendedAction: { label: 'Reload Page', isRetry: true },
  },
  502: {
    code: 502,
    name: 'Bad Gateway',
    category: 'Server Error (5xx)',
    summary: 'The portal gateway received an invalid or corrupt response from an upstream microservice or AI provider.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    accentGradient: 'from-orange-600 via-amber-600 to-red-600',
    glowColor: 'rgba(234, 88, 12, 0.25)',
    probableCauses: [
      'The AI test generation provider returned non-JSON data or unexpected schema format.',
      'An upstream reverse proxy or edge node failed to establish a handshake with the Next.js server.',
      'Backend server process restarted or crashed while servicing a long-running request.',
    ],
    troubleshootingSteps: [
      'Wait 15 seconds and re-attempt the action.',
      'If generating a test via AI, try slightly shortening the syllabus or prompt topic.',
      'Verify if your deployment platform (Vercel/Node) has reported any edge proxy incidents.',
    ],
    recommendedAction: { label: 'Retry Operation', isRetry: true },
  },
  503: {
    code: 503,
    name: 'Service Unavailable',
    category: 'Server Error (5xx)',
    summary: 'The assessment server is temporarily unable to handle the request due to maintenance, system cold start, or peak capacity.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    accentGradient: 'from-blue-600 via-cyan-600 to-indigo-700',
    glowColor: 'rgba(37, 99, 235, 0.25)',
    probableCauses: [
      'Scheduled maintenance or database migration is actively being performed by platform engineers.',
      'Peak concurrency: A large batch of simultaneous candidates saturated the server execution queue.',
      'Serverless function cold-start exceeded the initial connection allocation window.',
    ],
    troubleshootingSteps: [
      'Wait 30–60 seconds for the system queue to clear, then refresh the page.',
      'Check system announcements or status channels for scheduled maintenance notices.',
      'Rest assured that ongoing exam timers and draft answers remain safeguarded locally.',
    ],
    recommendedAction: { label: 'Check Status & Retry', isRetry: true },
  },
  504: {
    code: 504,
    name: 'Gateway Timeout',
    category: 'Server Error (5xx)',
    summary: 'The gateway server did not receive a timely response from an upstream backend service or external AI model.',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    accentGradient: 'from-pink-600 via-rose-600 to-purple-700',
    glowColor: 'rgba(219, 39, 119, 0.25)',
    probableCauses: [
      'Large test generation request with high question count exceeded upstream model execution timeout.',
      'Deep AI evaluation of descriptive candidate essays took longer than the edge gateway timeout window.',
      'Upstream network routing delay between the web server and the database tier.',
    ],
    troubleshootingSteps: [
      'For test generation: try requesting fewer questions per batch (e.g. 10 instead of 50).',
      'Refresh the page to see if the background generation process completed asynchronously.',
      'Verify that upstream external APIs are operational.',
    ],
    recommendedAction: { label: 'Retry Request', isRetry: true },
  },
};

export function getErrorCodeDetail(statusCode: number | string): ErrorCodeDetail {
  const codeNum = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;
  
  if (ERROR_CODES_REGISTRY[codeNum]) {
    return ERROR_CODES_REGISTRY[codeNum];
  }

  // Fallback for custom or unlisted HTTP codes
  const is5xx = codeNum >= 500 && codeNum < 600;
  const is4xx = codeNum >= 400 && codeNum < 500;

  return {
    code: isNaN(codeNum) ? 500 : codeNum,
    name: is5xx ? 'Server Error' : is4xx ? 'Client Error' : 'Unexpected Error',
    category: is5xx ? 'Server Error (5xx)' : 'Client Error (4xx)',
    summary: `The application encountered an HTTP status code ${codeNum || 500} while processing your request.`,
    badgeColor: is5xx ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentGradient: is5xx ? 'from-rose-600 via-red-600 to-purple-700' : 'from-amber-500 via-orange-600 to-rose-600',
    glowColor: is5xx ? 'rgba(225, 29, 72, 0.25)' : 'rgba(245, 158, 11, 0.25)',
    probableCauses: [
      `The server returned an unclassified HTTP ${codeNum} status code.`,
      'Request parameters or headers did not match expected server specifications.',
      'Network intermediate gateway or firewall intervened in transmission.',
      'Session token or cached client state may be out of synchronization.',
    ],
    troubleshootingSteps: [
      'Refresh the page or return to the main portal dashboard.',
      'Clear your browser cookies and cache to reset invalid session state.',
      'Contact your examination administrator if the issue repeats.',
    ],
    recommendedAction: { label: 'Return Home', href: '/' },
  };
}
