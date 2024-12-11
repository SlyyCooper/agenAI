/* ----------------------------------------------
 * ****⚠️ IMPORTANT: DO NOT EDIT THESE TYPES ⚠️****
 *----------------------------------------------

These interfaces are carefully synchronized with the backend models.
Any changes here must be matched with corresponding changes in:
- backend/server/firebase/storage_utils.py
- backend/server/firebase/firestore_utils.py 
- backend/server/firebase/stripe_utils.py
@maintenance: Must be kept in sync with backend model changes
*/

/**
 * @purpose: Storage Models - Map to storage_utils.py interfaces
 * @reference: See upload_file_to_storage() in storage_utils.py
 */
export interface FileUpload {
  file_stream: File | Blob  // @limitation: Frontend version of Python's BinaryIO/BytesIO
  filename: string
  content_type: string
  user_id?: string
  make_public: boolean
}

export interface UserReport {
  name: string
  full_path: string
  created_at: Date
  size: number
  content_type: string
}

export interface FileMetadata {
  name: string
  size: number
  content_type: string
  created: Date
  updated: Date
  public_url?: string
  type?: string
  title?: string
  userId?: string
  report_type?: string
  source?: string
  file_paths?: {
    pdf?: string
    docx?: string
    md?: string
  }
}

/**
 * @purpose: Firestore Models - Map to firestore_utils.py interfaces
 * @reference: See create_user_profile() and related functions
 */
export interface UserProfileData {
  email: string
  created_at: string  // @invariant: Must be ISO timestamp
  last_login: string  // @invariant: Must be ISO timestamp
  stripe_customer_id: string
  has_access: boolean
  one_time_purchase: boolean
  tokens: number
  name: string | null
  payment_history?: PaymentRecord[]
  notifications?: boolean
  token_history: any[]  // TODO: Define proper token history type
}

export interface ReportDocument {
  title: string
  created_at: Date | string
  file_urls: string[]
  query: string
  report_type: string
  id?: string
}

export interface UserProfileCreate {
  user_id: string
  email: string
  name?: string
}

export interface UserDataUpdate {
  email?: string
  name?: string
  last_login?: string
  has_access?: boolean
  one_time_purchase?: boolean
  tokens?: number
}

export interface CreateReportRequest {
  title: string
  file_urls: string[]
  query: string
  report_type: string
}

export interface ServerTimestamp {
  _seconds: number
  _nanoseconds: number
}

/**
 * @purpose: Stripe Models - Map to stripe_utils.py interfaces
 * @reference: See handle_stripe_webhook() and related handlers
 */
export interface SubscriptionData {
  subscription_status: 'active' | 'cancelled'
  subscription_id: string
  subscription_end_date: string
  product_id: string
  price_id: string
  has_access: boolean
  last_updated: Date
  status: 'active' | 'cancelled' | 'trialing'
  current_period_end: number
  cancel_at_period_end: boolean
}

export interface TokenTransaction {
  amount: number
  type: 'purchase' | 'subscription' | 'usage' | 'bonus'
  timestamp: Date | ServerTimestamp
}

export interface Product {
  product_id: string
  price_id: string
  name: string
  price: number
  features: string[]
}

export interface CheckoutSessionRequest {
  price_id: string
  mode: 'subscription' | 'payment'
}

export interface SubscriptionStatusResponse {
  has_access: boolean
  subscription_status?: string
  subscription_end_date?: string
  subscription_id?: string
  one_time_purchase: boolean
  tokens: number
}

export interface ProductsResponse {
  subscription: Product
  one_time: Product
}

export interface AccessStatus {
  has_access: boolean
  access_type: 'subscription' | 'one_time' | null
  access_expiry?: string
}

export interface PaymentHistory {
  payments: Array<{
    id: string
    amount: number
    status: string
    created: number
    currency: string
  }>
}

/**
 * @purpose: Payment record tracking models
 * @reference: See update_payment_history() in firestore_utils.py
 * @invariant: created_at must be ISO timestamp
 */
export interface PaymentRecord {
  type: 'payment' | 'subscription'
  amount: number
  status: string
  payment_id?: string
  invoice_id?: string
  created_at: string
}

export interface PaymentHistoryResponse {
  payment_history: PaymentRecord[]
}

export interface CancelSubscriptionResponse {
  status: string;
  subscription: {
    id: string;
    status: string;
    cancel_at_period_end: boolean;
    current_period_end: number;
    // ... other relevant fields
  };
}

export interface TokenBalanceResponse {
  tokens: number
  token_history: Array<{
    amount: number
    type: string
    timestamp: ServerTimestamp
  }>
}

/**
 * @purpose: Webhook event type for handling server events
 */
export interface WebhookEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface StorageFile {
  name: string;
  path: string;
  type: string;
  size: number;
  created: string;
  updated: string;
  metadata: {
    contentType: string;
    size: number;
    created: Date;
    updated: Date;
    customMetadata: Record<string, string>;
  };
  url: string;
}

export interface StorageFileResponse extends Omit<StorageFile, 'url'> {
  url?: string;
}

export interface UploadProgressItem {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

export interface UploadProgress {
  [path: string]: number | UploadProgressItem;
}

export interface StorageHook {
  uploadFile: (file: File, path: string) => Promise<string>;
  downloadFile: (path: string) => Promise<Blob>;
  deleteFile: (path: string) => Promise<void>;
  getFileUrl: (path: string) => Promise<string>;
  listFiles: (prefix: string) => Promise<StorageFile[]>;
  uploadProgress: UploadProgress;
  validateFile: (file: File) => Promise<void>;
  getStorageQuota: () => Promise<{used: number; total: number}>;
}

export interface ResearchReportUrls {
  pdf?: string;
  docx?: string;
  md?: string;
}

export interface ResearchReportMetadata {
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  report_type: string;
  userId: string;
  metadata: {
    sources: any[];
    topics: string[];
    summary: string;
  };
}

export interface StorageErrorCustomData {
  serverResponse: string;
  [key: string]: unknown;
}

export interface StorageError extends Error {
  code: string;
  customData: StorageErrorCustomData;
}

export interface StorageValidation {
  MAX_FILE_SIZE_MB: number;
  SUPPORTED_FORMATS: string[];
  CLEANUP_AGE_DAYS: number;
  MAX_FILES_PER_USER: number;
  MIME_TYPES: {
    [key: string]: string;
  };
}

export interface StorageConfig {
  validation: StorageValidation;
  paths: {
    reports: string;
    research: string;
    temp: string;
    public: string;
  };
  cache?: {
    TTL: number;
    MAX_SIZE: number;
  };
}

export interface ReportStorageError extends StorageError {
  type: 'cleanup' | 'transaction' | 'validation' | 'maintenance';
  details: {
    reason: string;
    [key: string]: unknown;
  };
  customData: StorageErrorCustomData;
}

// Research Types
export type ReportType = 'research_report' | 'detailed_report' | 'multi_agents';
export type ReportSource = 'web' | 'local' | 'hybrid';
export type Tone = 'balanced' | 'formal' | 'casual' | 'professional' | 'academic';
export type Retriever = 
  | 'arxiv'
  | 'bing'
  | 'custom'
  | 'duckduckgo'
  | 'exa'
  | 'google'
  | 'searchapi'
  | 'searx'
  | 'semantic_scholar'
  | 'serpapi'
  | 'serper'
  | 'tavily'
  | 'pubmed_central';

export interface ResearchSettings {
  // Required
  type: 'research';
  task: string;

  // Optional Research Settings
  report_type?: ReportType;
  report_source?: ReportSource;
  report_format?: string;
  total_words?: number;
  max_subtopics?: number;
  tone?: Tone;

  // Optional LLM Settings
  llm_provider?: string;
  llm_model?: string;
  temperature?: number;
  llm_temperature?: number;

  // Optional Search Settings
  retrievers?: Retriever[];
  max_search_results_per_query?: number;
  similarity_threshold?: number;

  // Optional Token Settings
  fast_token_limit?: number;
  smart_token_limit?: number;
  summary_token_limit?: number;

  // Optional Document Settings
  doc_path?: string;
  browse_chunk_max_length?: number;

  // Optional Agent Settings
  agent_role?: string;
  max_iterations?: number;
  scraper?: string;
}

export interface ResearchResponse {
  type: string;
  content?: string;
  output?: string;
  status?: 'success' | 'error';
  message?: string;
  metadata?: {
    sources?: Array<{ title: string; url: string }>;
    topics?: string[];
    summary?: string;
    error?: string;
  };
}