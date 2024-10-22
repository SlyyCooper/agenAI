export async function getUserProfile(token: string) {
    const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return response.json();
  }