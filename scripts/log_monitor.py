import subprocess
import json
import re
from datetime import datetime
import os
from typing import Dict, List, Set
from collections import defaultdict

class LogMonitor:
    def __init__(self):
        self.app_id = "ee7c9660-40cc-4e21-9924-b17dd3281a68"  # Your DO app ID
        self.error_patterns = {
            "websocket": [
                r"WebSocket.*403",
                r"connection rejected",
                r"WebSocket.*connection.*closed",
            ],
            "http": [
                r"\d{3} (?:Not Found|Forbidden|Internal Server Error)",
                r"Request failed with status code \d{3}",
            ],
            "auth": [
                r"Token verification error",
                r"Authentication error",
                r"Invalid token",
                r"Token expired",
            ],
            "system": [
                r"ERROR:",
                r"Error:",
                r"error:",
                r"Traceback",
                r"Exception:",
            ],
            "firestore": [
                r"Firestore.*error",
                r"Database.*error",
                r"Document.*not found",
            ]
        }
        self.error_log_file = ".memory/error_logs.md"
        self.error_summary_file = ".memory/error_summary.md"
        self.request_tracking: Dict[str, Dict] = {}
        self.error_counts = defaultdict(int)
        self.seen_errors: Set[str] = set()
        self.ensure_memory_dir()

    def ensure_memory_dir(self):
        """Ensure .memory directory exists"""
        if not os.path.exists(".memory"):
            os.makedirs(".memory")

    def format_error_for_markdown(self, timestamp: str, category: str, error_type: str, details: str, context: List[str], request_info: Dict = None) -> str:
        """Format error information into markdown"""
        md = f"""
### Error Detected at {timestamp}
**Category:** {category}
**Type:** {error_type}
**Details:** {details}
"""
        if request_info:
            md += f"""
**Request Information:**
- Method: {request_info.get('method', 'N/A')}
- Path: {request_info.get('path', 'N/A')}
- Status: {request_info.get('status', 'N/A')}
- Duration: {request_info.get('duration', 'N/A')}
"""

        md += f"""
**Context:**
```
{''.join(context)}
```
---
"""
        return md

    def update_error_summary(self):
        """Update the error summary markdown file"""
        summary = f"""
# Error Summary (Updated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")})

## Error Counts by Category
"""
        for category, patterns in self.error_patterns.items():
            category_count = sum(self.error_counts[pattern] for pattern in patterns)
            if category_count > 0:
                summary += f"\n### {category.title()}\n"
                summary += f"Total Errors: {category_count}\n"
                for pattern in patterns:
                    if self.error_counts[pattern] > 0:
                        summary += f"- {pattern}: {self.error_counts[pattern]}\n"

        with open(self.error_summary_file, "w") as f:
            f.write(summary)

    def extract_error_context(self, logs: List[str], error_index: int, context_lines: int = 5) -> List[str]:
        """Extract lines before and after the error for context"""
        start = max(0, error_index - context_lines)
        end = min(len(logs), error_index + context_lines + 1)
        return logs[start:end]

    def extract_request_info(self, context: List[str]) -> Dict:
        """Extract request information from context"""
        info = {}
        for line in context:
            if "Request:" in line:
                match = re.search(r"Request: (\w+) (.+)", line)
                if match:
                    info["method"] = match.group(1)
                    info["path"] = match.group(2)
            elif "Response: Status" in line:
                match = re.search(r"Status (\d+)", line)
                if match:
                    info["status"] = match.group(1)
            elif "Process time:" in line:
                match = re.search(r"Process time: ([\d.]+)s", line)
                if match:
                    info["duration"] = f"{match.group(1)}s"
        return info

    def monitor_logs(self):
        """Monitor logs in real-time and extract errors"""
        try:
            process = subprocess.Popen(
                ["doctl", "apps", "logs", self.app_id, "--follow"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )

            log_buffer: List[str] = []
            buffer_size = 20

            print("🔍 Monitoring logs for errors...")
            print("📝 Errors will be saved to:")
            print(f"   - {self.error_log_file}")
            print(f"   - {self.error_summary_file}")
            
            while True:
                line = process.stdout.readline()
                if not line:
                    break

                log_buffer.append(line)
                if len(log_buffer) > buffer_size:
                    log_buffer.pop(0)

                # Check for errors in each category
                for category, patterns in self.error_patterns.items():
                    for pattern in patterns:
                        if re.search(pattern, line):
                            error_hash = f"{category}:{line.strip()}"
                            if error_hash not in self.seen_errors:
                                self.seen_errors.add(error_hash)
                                self.error_counts[pattern] += 1
                                
                                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                context = self.extract_error_context(log_buffer, len(log_buffer) - 1)
                                request_info = self.extract_request_info(context)
                                
                                error_entry = self.format_error_for_markdown(
                                    timestamp,
                                    category,
                                    pattern,
                                    line.strip(),
                                    context,
                                    request_info
                                )
                                
                                with open(self.error_log_file, "a") as f:
                                    f.write(error_entry)
                                
                                self.update_error_summary()
                                
                                print(f"❌ {category.upper()} error detected and logged at {timestamp}")
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