import { useState, useCallback } from 'react';
import { APIError, FirebaseError, StripeError, getUserFriendlyError } from '../utils/errorUtils';

interface ErrorState {
  message: string;
  code?: string;
  statusCode?: number;
  type?: 'api' | 'firebase' | 'stripe' | 'unknown';
}

interface UseAPIError {
  error: ErrorState | null;
  setError: (error: unknown) => void;
  clearError: () => void;
  handleError: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

/**
 * @purpose: Custom hook for handling API errors in React components
 * @example:
 *   const { error, handleError } = useAPIError();
 *   await handleError(async () => {
 *     await api.someOperation();
 *   });
 */
export const useAPIError = (): UseAPIError => {
  const [error, setErrorState] = useState<ErrorState | null>(null);

  const setError = useCallback((error: unknown) => {
    if (!(error instanceof Error)) {
      setErrorState({
        message: 'An unknown error occurred',
        type: 'unknown'
      });
      return;
    }

    const message = getUserFriendlyError(error);
    const errorState: ErrorState = { message };

    if (error instanceof APIError) {
      errorState.statusCode = error.statusCode;
      errorState.code = error.code;
      errorState.type = 'api';
    } else if (error instanceof FirebaseError) {
      errorState.code = error.code;
      errorState.type = 'firebase';
    } else if (error instanceof StripeError) {
      errorState.code = error.code;
      errorState.type = 'stripe';
    } else {
      errorState.type = 'unknown';
    }

    setErrorState(errorState);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const handleError = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      clearError();
      return await fn();
    } catch (error) {
      setError(error);
      return undefined;
    }
  }, [clearError, setError]);

  return {
    error,
    setError,
    clearError,
    handleError
  };
}; 