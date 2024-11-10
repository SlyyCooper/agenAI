import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

export default function ProfileSettings({ user }: { user: User }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
      <form>
        <div className="mb-4">
          <label htmlFor="name" className="block mb-2">Name</label>
          <input type="text" id="name" defaultValue={user.name} className="w-full p-2 border rounded" />
        </div>
        <div className="mb-4">
          <label htmlFor="email" className="block mb-2">Email</label>
          <input type="email" id="email" defaultValue={user.email} className="w-full p-2 border rounded" />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Save Changes</button>
      </form>
    </div>
  );
}