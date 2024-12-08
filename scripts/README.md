# Log Monitor Script

This script monitors your Digital Ocean app logs in real-time and automatically extracts errors and their context into a markdown file for easy review.

## Features

- Real-time monitoring of Digital Ocean app logs
- Automatic error detection with configurable patterns
- Context preservation (5 lines before and after each error)
- Markdown formatting for easy reading
- Error logs stored in `.memory/error_logs.md`

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
   - Errors are automatically saved to `.memory/error_logs.md`
   - Each error entry includes:
     - Timestamp
     - Error type
     - Error details
     - Context (surrounding log lines)

## Error Patterns

The script monitors for the following patterns:
- ERROR:
- Error:
- error:
- HTTP error codes (404, 403, 500)
- Connection rejections
- Tracebacks
- Exceptions

## Stopping the Monitor

Press `Ctrl+C` to stop the monitoring process. 