import { useState, useCallback } from 'react';
import { APIError, FirebaseError, StripeError, getUserFriendlyError } from '../utils/errorUtils';

interface ErrorState {
  message: string;
  code?: string;
  statusCode?: number;
}

interface UseAPIError {
  error: ErrorState | null;
  setError: (error: Error) => void;
  clearError: () => void;
  handleError: (fn: () => Promise<any>) => Promise<any>;
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

  const setError = useCallback((error: Error) => {
    const message = getUserFriendlyError(error);
    const errorState: ErrorState = { message };

    if (error instanceof APIError) {
      errorState.statusCode = error.statusCode;
      errorState.code = error.code;
    } else if (error instanceof FirebaseError || error instanceof StripeError) {
      errorState.code = error.code;
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
      setError(error as Error);
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