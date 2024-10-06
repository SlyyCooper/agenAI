import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export default function ProfileHeader({ user }: { user: User }) {
  return (
    <div className="flex items-center space-x-4">
      <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full" />
      <div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-gray-600">{user.email}</p>
      </div>
    </div>
  );
}