export async function getUserReports(token: string) {
    const response = await fetch('https://dolphin-app-49eto.ondigitalocean.app/backend/user/reports', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user reports');
    }
    return response.json();
  }