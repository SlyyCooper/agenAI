# Log Monitor Script

This script monitors your Digital Ocean app logs in real-time and automatically extracts errors and their context into markdown files for easy review and debugging.

## Features

- Real-time monitoring of Digital Ocean app logs
- Automatic error detection with categorized patterns:
  - WebSocket errors
  - HTTP errors
  - Authentication errors
  - System errors
  - Firestore errors
- Request tracking with method, path, status, and duration
- Context preservation (5 lines before and after each error)
- Error deduplication to avoid repetitive entries
- Error count tracking and summaries
- Markdown formatting for easy reading

## Output Files

1. `.memory/error_logs.md`: Detailed error logs with:
   - Timestamp
   - Error category
   - Error type
   - Error details
   - Request information (if available)
   - Context (surrounding log lines)

2. `.memory/error_summary.md`: Error statistics with:
   - Error counts by category
   - Pattern-specific counts
   - Last update timestamp

## Prerequisites

1. `doctl` CLI tool installed and configured
2. Python 3.7+
3. Digital Ocean app ID (configured in the script)

## Usage

1. Make sure you're authenticated with Digital Ocean:
   ```bash
   doctl auth init
   ```

2. Run the script:
   ```bash
   python scripts/log_monitor.py
   ```

3. View errors:
   - Real-time errors are logged to `.memory/error_logs.md`
   - Error summaries are updated in `.memory/error_summary.md`
   - Terminal shows live error notifications with categories

## Error Categories and Patterns

1. WebSocket:
   - WebSocket 403 errors
   - Connection rejections
   - Connection closures

2. HTTP:
   - Status codes (404, 403, 500)
   - Failed requests

3. Authentication:
   - Token verification errors
   - Authentication failures
   - Invalid/expired tokens

4. System:
   - General errors
   - Tracebacks
   - Exceptions

5. Firestore:
   - Database errors
   - Document not found errors

## Stopping the Monitor

Press `Ctrl+C` to stop the monitoring process. 