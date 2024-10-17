// This function determines the appropriate host URL based on the environment and purpose
export const getHost = ({purpose} = {}) => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Extract the host from the current window location
    let { host } = window.location;

    // If the purpose is specifically for 'langgraph-gui'
    if (purpose == 'langgraph-gui') {
      // Return localhost URL for development, or production backend URL
      return host.includes('localhost')
        ? 'http://127.0.0.1:8123'
        : 'https://dolphin-app-49eto.ondigitalocean.app/backend';
    } else {
      // For all other purposes, use a different localhost port for development
      return host.includes('localhost')
        ? 'http://localhost:8000'
        : 'https://dolphin-app-49eto.ondigitalocean.app/backend';
    }
  }
  // If not in a browser environment, return an empty string
  return '';
};
