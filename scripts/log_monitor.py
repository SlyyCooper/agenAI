import subprocess
import json
import re
from datetime import datetime
import os
from typing import Dict, List, Set, Optional
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
            ],
            "build": [
                r"Build failed",
                r"Error building application",
                r"Failed to install requirements",
                r"Could not find a version that satisfies the requirement",
                r"pip install.*failed",
                r"ModuleNotFoundError",
                r"ImportError",
                r"SyntaxError",
                r"IndentationError"
            ]
        }
        self.build_status_patterns = {
            "start": r"Building application...",
            "installing": r"Installing dependencies...",
            "compiling": r"Compiling application...",
            "deploying": r"Deploying application...",
            "success": r"Deployment successful",
            "failure": r"Deployment failed"
        }
        self.error_log_file = ".memory/error_logs.md"
        self.error_summary_file = ".memory/error_summary.md"
        self.build_log_file = ".memory/build_logs.md"
        self.build_summary_file = ".memory/build_summary.md"
        self.request_tracking: Dict[str, Dict] = {}
        self.error_counts = defaultdict(int)
        self.seen_errors: Set[str] = set()
        self.current_build: Optional[Dict] = None
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

    def format_build_for_markdown(self, build_info: Dict) -> str:
        """Format build information into markdown"""
        md = f"""
### Build {build_info['id']} - {build_info['status']}
**Started:** {build_info['start_time']}
**Completed:** {build_info.get('end_time', 'In Progress')}
**Duration:** {build_info.get('duration', 'In Progress')}

**Build Steps:**
"""
        for step in build_info['steps']:
            status_icon = "✅" if step['status'] == 'success' else "❌" if step['status'] == 'failed' else "⏳"
            md += f"- {status_icon} {step['name']}\n"

        if build_info.get('error'):
            md += f"""
**Error Details:**
```
{build_info['error']}
```
"""

        md += "---\n"
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

    def update_build_summary(self):
        """Update the build summary markdown file"""
        if not self.current_build:
            return

        with open(self.build_log_file, "a") as f:
            f.write(self.format_build_for_markdown(self.current_build))

        summary = f"""
# Build Summary (Updated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")})

## Latest Build
- **ID:** {self.current_build['id']}
- **Status:** {self.current_build['status']}
- **Started:** {self.current_build['start_time']}
- **Duration:** {self.current_build.get('duration', 'In Progress')}

## Build Steps Status
"""
        for step in self.current_build['steps']:
            status_icon = "✅" if step['status'] == 'success' else "❌" if step['status'] == 'failed' else "⏳"
            summary += f"- {status_icon} {step['name']}\n"

        with open(self.build_summary_file, "w") as f:
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

    def process_build_line(self, line: str):
        """Process a line from build logs"""
        if not self.current_build:
            # Check if this is the start of a new build
            if "Building application..." in line:
                self.current_build = {
                    'id': datetime.now().strftime("%Y%m%d_%H%M%S"),
                    'status': 'in_progress',
                    'start_time': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    'steps': [],
                }

        if self.current_build:
            # Update status of current step if it exists
            if self.current_build['steps']:
                current_step = self.current_build['steps'][-1]
                if "successful" in line.lower() or "completed" in line.lower():
                    current_step['status'] = 'success'
                elif "failed" in line.lower() or "error" in line.lower():
                    current_step['status'] = 'failed'

            # Check for new build steps
            for step_name, pattern in self.build_status_patterns.items():
                if re.search(pattern, line):
                    self.current_build['steps'].append({
                        'name': step_name,
                        'status': 'in_progress',
                        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    })
                    self.update_build_summary()
                    break

            # Check for build errors
            for pattern in self.error_patterns['build']:
                if re.search(pattern, line):
                    self.current_build['error'] = line.strip()
                    self.current_build['status'] = 'failed'
                    self.current_build['end_time'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    self.current_build['duration'] = str(
                        datetime.now() - datetime.strptime(self.current_build['start_time'], "%Y-%m-%d %H:%M:%S")
                    )
                    self.update_build_summary()
                    break

            # Check for build completion
            if "Deployment successful" in line:
                self.current_build['status'] = 'success'
                self.current_build['end_time'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                self.current_build['duration'] = str(
                    datetime.now() - datetime.strptime(self.current_build['start_time'], "%Y-%m-%d %H:%M:%S")
                )
                self.update_build_summary()
                self.current_build = None

    def monitor_logs(self, log_type="all"):
        """Monitor logs in real-time and extract errors and build information"""
        try:
            cmd = ["doctl", "apps", "logs", self.app_id]
            
            # Set correct log type parameter
            if log_type == "build":
                cmd.extend(["--type", "BUILD"])
            elif log_type == "runtime":
                cmd.extend(["--type", "RUN"])
            elif log_type == "all":
                # For 'all', we'll need to run two separate processes
                build_cmd = cmd + ["--type", "BUILD"]
                run_cmd = cmd + ["--type", "RUN"]
                
                # Start both processes
                build_process = subprocess.Popen(
                    build_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    universal_newlines=True
                )
                run_process = subprocess.Popen(
                    run_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    universal_newlines=True
                )
                
                processes = [build_process, run_process]
            else:
                processes = [subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    universal_newlines=True
                )]

            log_buffer: List[str] = []
            buffer_size = 20

            print(f"🔍 Monitoring {log_type} logs...")
            print("📝 Logs will be saved to:")
            print(f"   - {self.error_log_file}")
            print(f"   - {self.error_summary_file}")
            if log_type in ["all", "build"]:
                print(f"   - {self.build_log_file}")
                print(f"   - {self.build_summary_file}")
            
            while True:
                for process in processes:
                    line = process.stdout.readline()
                    if not line:
                        continue

                    log_buffer.append(line)
                    if len(log_buffer) > buffer_size:
                        log_buffer.pop(0)

                    # Process build information if monitoring builds
                    if log_type in ["all", "build"]:
                        self.process_build_line(line)

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
            if 'processes' in locals():
                for process in processes:
                    process.terminate()
            elif 'process' in locals():
                process.terminate()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Monitor DigitalOcean app logs')
    parser.add_argument('--type', choices=['all', 'build', 'runtime'], default='all',
                      help='Type of logs to monitor (default: all)')
    args = parser.parse_args()
    
    monitor = LogMonitor()
    monitor.monitor_logs(args.type) 