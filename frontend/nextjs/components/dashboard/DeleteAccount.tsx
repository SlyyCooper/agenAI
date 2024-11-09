import React from 'react';

interface User {
  id: string;
}

export default function DeleteAccount({ user }: { user: User }) {
  const handleDeleteAccount = () => {
    // Implement account deletion logic here
    console.log(`Deleting account for user ${user.id}`);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Delete Account</h2>
      <p className="mb-4">Warning: This action cannot be undone.</p>
      <button
        onClick={handleDeleteAccount}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        Delete My Account
      </button>
    </div>
  );
}