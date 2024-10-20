# Downloading PDF and DOCX Reports

## Backend (server_utils.py and server.py)

### File Generation
- **Function**: `generate_report_files(report: str, filename: str) -> Dict[str, str]`
  - Creates PDF, DOCX, and MD files
  - Returns a dictionary with file paths

### WebSocket Communication
- **Function**: `send_file_paths(websocket, file_paths: Dict[str, str])`
  - Sends file paths to the client via WebSocket
  - Message format: `{"type": "path", "output": file_paths}`

### Static File Serving
- Server sets up a static file server for the "outputs" directory
- Allows client to access generated files via HTTP requests

### WebSocket Endpoint
- Handles connections and communication with clients
- Uses `WebSocketManager` to manage connections

## Frontend (page.tsx)

### WebSocket Handling
- Establishes WebSocket connection with the backend
- Listens for messages of type "path"

### File Path Processing
- Receives file paths from WebSocket message
- Updates state with received file paths

### Download Component
- **Component**: `AccessReport`
  - Renders download links for PDF and DOCX files
  - Uses received file paths to create download URLs

### User Interface
- Displays download links after report generation
- Allows users to easily access and download generated reports

## Key Points
1. Backend generates files and sends paths via WebSocket
2. Frontend receives paths and creates download links
3. Static file serving enables direct file downloads
4. Process is asynchronous, allowing for real-time updates

## Next Steps
- Investigate error handling for file generation and download process
- Consider implementing progress indicators for large file downloads
- Explore options for secure file access and user authentication


