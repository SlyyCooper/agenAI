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
  name?: string
  payment_history?: PaymentRecord[]
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