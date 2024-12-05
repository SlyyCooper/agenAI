'use client';

import { Button } from "@/components/ui/button"
import { useFirebase } from '@/hooks/useFirebase';
import { useState } from 'react';

interface GoogleAuthButtonProps {
  onClick: () => Promise<void>;
}

export default function GoogleAuthButton({ onClick }: GoogleAuthButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
    >
      <img
        className="w-5 h-5 mr-2"
        src="https://www.svgrepo.com/show/475656/google-color.svg"
        loading="lazy"
        alt="google logo"
      />
      <span>Google</span>
    </button>
  );
}