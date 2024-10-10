import React from 'react';
import Image from 'next/image';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export default function ProfileHeader({ user }: { user: User }) {
  return (
    <div className="flex items-center space-x-4">
      <Image
        src={user.avatar}
        alt={user.name}
        width={64}
        height={64}
        className="rounded-full"
      />
      <div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-gray-600">{user.email}</p>
      </div>
    </div>
  );
}