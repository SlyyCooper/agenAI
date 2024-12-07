'use client';

import { Button } from "@/components/ui/button"
import { useFirebase } from '@/hooks/useFirebase';
import { useState } from 'react';
import Image from 'next/image';

interface GoogleAuthButtonProps {
  onClick: () => Promise<void>;
}

export default function GoogleAuthButton({ onClick }: GoogleAuthButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
    >
      <Image 
        src="/img/google.svg" 
        alt="Google Logo" 
        width={20} 
        height={20}
        priority
      />
      <span>Continue with Google</span>
    </button>
  );
}