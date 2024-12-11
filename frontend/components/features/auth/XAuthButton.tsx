'use client';

import { Button } from "@/components/ui/button"
import { useFirebase } from '@/hooks/useFirebase';
import { useState } from 'react';

interface XAuthButtonProps {
  onClick: () => Promise<void>;
}

export default function XAuthButton({ onClick }: XAuthButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
    >
      <svg
        className="w-5 h-5 mr-2"
        aria-hidden="true"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      <span>X (Twitter)</span>
    </button>
  );
}