export const getHost = ({purpose} = {}) => {
  if (typeof window !== 'undefined') {
    let { host } = window.location;
    if (purpose == 'langgraph-gui') {
      return host.includes('localhost')
        ? 'http://127.0.0.1:8123'
        : 'https://dolphin-app-49eto.ondigitalocean.app/backend';
    } else {
      return host.includes('localhost')
        ? 'http://localhost:8000'
        : 'https://dolphin-app-49eto.ondigitalocean.app/backend';
    }
  }
  return '';
};

