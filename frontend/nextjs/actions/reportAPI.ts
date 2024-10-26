import { getAuth } from 'firebase/auth';

const BASE_URL = 'https://dolphin-app-49eto.ondigitalocean.app/backend';

// Types
export interface Report {
  id: string;
  title: string;
  created_at: string;
  file_urls: string[];
  query: string;
  report_type: string;
}

export interface ReportHistory {
  amount: number;
  type: string;
  timestamp: string;
  reason?: string;
}

export interface ReportsResponse {
  reports: Report[];
  remaining_reports: number;
  report_history: ReportHistory[];
}

// Helper function to get Firebase token
const getFirebaseToken = async (): Promise<string> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No user logged in');
  }
  return await currentUser.getIdToken();
};

// API Functions
export async function getUserReports(): Promise<ReportsResponse> {
  try {
    const token = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/reports`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch user reports');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user reports:', error);
    throw error;
  }
}

export async function getRemainingReports(): Promise<number> {
  try {
    const token = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/remaining-reports`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch remaining reports');
    }
    
    const data = await response.json();
    return data.remaining_reports;
  } catch (error) {
    console.error('Error fetching remaining reports:', error);
    throw error;
  }
}

export async function getReportHistory(): Promise<ReportHistory[]> {
  try {
    const token = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/report-history`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch report history');
    }
    
    const data = await response.json();
    return data.report_history;
  } catch (error) {
    console.error('Error fetching report history:', error);
    throw error;
  }
}

export async function consumeReport(reason: string): Promise<{
  success: boolean;
  remaining_reports: number;
  message?: string;
}> {
  try {
    const token = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/consume-report`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to consume report');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error consuming report:', error);
    throw error;
  }
}

export async function checkReportAvailability(): Promise<{
  can_generate: boolean;
  remaining_reports: number;
  message?: string;
}> {
  try {
    const token = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/user/check-report-availability`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to check report availability');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking report availability:', error);
    throw error;
  }
}
