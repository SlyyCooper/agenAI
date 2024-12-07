import React from 'react';
import { AuthContext } from '@/config/firebase/AuthContext';

interface TestProviderProps {
  children: React.ReactNode;
  mockUser?: any;
  mockUserProfile?: any;
}

export const TestProvider: React.FC<TestProviderProps> = ({
  children,
  mockUser = null,
  mockUserProfile = null
}) => {
  return (
    <AuthContext.Provider
      value={{
        user: mockUser,
        userProfile: mockUserProfile,
        loading: false,
        error: null
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 