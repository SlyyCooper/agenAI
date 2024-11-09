// Storage Related Types
export interface FileUpload {
  fileStream: File | Blob  // Frontend version of BinaryIO/BytesIO
  filename: string
  contentType: string
  userId?: string
  makePublic: boolean
}

export interface UserReport {
  name: string
  fullPath: string
  createdAt: Date
  size: number
  contentType: string
}

export interface FileMetadata {
  name: string
  size: number
  contentType: string
  created: Date
  updated: Date
  publicUrl?: string
}

// User Related Types
export interface UserProfileData {
  email: string
  createdAt: string  // ISO timestamp
  lastLogin: string  // ISO timestamp
  stripeCustomerId: string
  hasAccess: boolean
  oneTimePurchase: boolean
  tokens: number
  name?: string
}

// Report Related Types
export interface ReportDocument {
  title: string
  createdAt: Date
  fileUrls: string[]
  query: string
  reportType: string
}

// Payment & Subscription Related Types
export interface SubscriptionData {
  subscriptionStatus: 'active' | 'cancelled'
  subscriptionId: string
  subscriptionEndDate: Date
  productId: string
  priceId: string
  hasAccess: boolean
  lastUpdated: Date
}

export interface TokenTransaction {
  amount: number
  type: 'purchase'
  timestamp: Date
}

export interface Product {
  productId: string
  priceId: string
  name: string
  price: number
  features: string[]
}

export interface CheckoutSessionRequest {
  priceId: string
  mode: 'subscription' | 'payment'
}

// API Response Types
export interface SubscriptionStatusResponse {
  hasAccess: boolean
  subscriptionStatus?: string
  subscriptionEndDate?: string
  subscriptionId?: string
  oneTimePurchase: boolean
}

export interface ProductsResponse {
  subscription: Product
  oneTime: Product
}

export interface AccessStatus {
  hasAccess: boolean
  accessType: 'subscription' | 'one_time' | null
  accessExpiry?: string
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