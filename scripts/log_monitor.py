import subprocess
import json
import re
from datetime import datetime
import os
from typing import Dict, List

class LogMonitor:
    def __init__(self):
        self.app_id = "ee7c9660-40cc-4e21-9924-b17dd3281a68"  # Your DO app ID
        self.error_patterns = [
            r"ERROR:",
            r"Error:",
            r"error:",
            r"\d{3} (?:Not Found|Forbidden|Internal Server Error)",
            r"connection rejected",
            r"Traceback",
            r"Exception:"
        ]
        self.error_log_file = ".memory/error_logs.md"
        self.ensure_memory_dir()

    def ensure_memory_dir(self):
        """Ensure .memory directory exists"""
        if not os.path.exists(".memory"):
            os.makedirs(".memory")

    def format_error_for_markdown(self, timestamp: str, error_type: str, details: str, context: List[str]) -> str:
        """Format error information into markdown"""
        return f"""
### Error Detected at {timestamp}
**Type:** {error_type}
**Details:** {details}

**Context:**
```
{''.join(context)}
```
---
"""

    def extract_error_context(self, logs: List[str], error_index: int, context_lines: int = 5) -> List[str]:
        """Extract lines before and after the error for context"""
        start = max(0, error_index - context_lines)
        end = min(len(logs), error_index + context_lines + 1)
        return logs[start:end]

    def monitor_logs(self):
        """Monitor logs in real-time and extract errors"""
        try:
            # Start the doctl logs command
            process = subprocess.Popen(
                ["doctl", "apps", "logs", self.app_id, "--follow"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )

            # Buffer to store recent log lines for context
            log_buffer: List[str] = []
            buffer_size = 20

            print("🔍 Monitoring logs for errors...")
            
            while True:
                line = process.stdout.readline()
                if not line:
                    break

                # Add line to buffer
                log_buffer.append(line)
                if len(log_buffer) > buffer_size:
                    log_buffer.pop(0)

                # Check for errors
                for pattern in self.error_patterns:
                    if re.search(pattern, line):
                        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        error_type = pattern.replace(":", "").strip()
                        
                        # Get context
                        context = self.extract_error_context(log_buffer, len(log_buffer) - 1)
                        
                        # Format error entry
                        error_entry = self.format_error_for_markdown(
                            timestamp,
                            error_type,
                            line.strip(),
                            context
                        )
                        
                        # Append to markdown file
                        with open(self.error_log_file, "a") as f:
                            f.write(error_entry)
                        
                        print(f"❌ Error detected and logged at {timestamp}")
                        break

        except KeyboardInterrupt:
            print("\n👋 Stopping log monitor...")
        except Exception as e:
            print(f"🚨 Error in log monitor: {str(e)}")
        finally:
            if process:
                process.terminate()

if __name__ == "__main__":
    monitor = LogMonitor()
    monitor.monitor_logs() 