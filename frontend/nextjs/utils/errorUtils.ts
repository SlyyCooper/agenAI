/**
 * @purpose: Custom error types for better error handling
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class FirebaseError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'FirebaseError';
  }
}

export class StripeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public decline_code?: string
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

/**
 * @purpose: Handle API response errors consistently
 * @performance: O(1) error processing
 */
export const handleAPIError = async (response: Response): Promise<never> => {
  const error = await response.json();
  throw new APIError(
    error.detail || 'An unexpected error occurred',
    response.status,
    error.code
  );
};

/**
 * @purpose: Process Firebase errors with proper typing
 * @performance: O(1) error mapping
 */
export const handleFirebaseError = (error: any): never => {
  throw new FirebaseError(
    error.message || 'Firebase operation failed',
    error.code
  );
};

/**
 * @purpose: Format user-friendly error messages
 * @performance: O(1) message mapping
 */
export const getUserFriendlyError = (error: Error): string => {
  if (error instanceof APIError) {
    switch (error.statusCode) {
      case 401:
        return 'Please sign in to continue';
      case 403:
        return 'You don\'t have permission to perform this action';
      case 404:
        return 'The requested resource was not found';
      default:
        return error.message;
    }
  }

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'User account not found';
      case 'auth/wrong-password':
        return 'Invalid password';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later';
      default:
        return error.message;
    }
  }

  if (error instanceof StripeError) {
    switch (error.code) {
      case 'card_declined':
        return 'Your card was declined. Please try another card';
      case 'expired_card':
        return 'Your card has expired. Please update your payment method';
      case 'insufficient_funds':
        return 'Insufficient funds. Please try another payment method';
      default:
        return error.message;
    }
  }

  return 'An unexpected error occurred. Please try again';
}; 