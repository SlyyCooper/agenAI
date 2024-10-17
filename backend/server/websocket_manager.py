import asyncio
import datetime
from typing import Dict, List, Tuple
from dotenv import load_dotenv
from fastapi import WebSocket, HTTPException, Depends
from firebase_admin import auth

from backend.report_type import BasicReport, DetailedReport
from gpt_researcher.utils.enum import ReportType, Tone
from multi_agents.main import run_research_task
from gpt_researcher.orchestrator.actions import stream_output
from backend.server.server import get_authenticated_user_id

class WebSocketManager:
    """Manage websockets"""

    def __init__(self):
        """Initialize the WebSocketManager class."""
        self.active_connections: List[Tuple[str, WebSocket]] = []
        self.sender_tasks: Dict[WebSocket, asyncio.Task] = {}
        self.message_queues: Dict[WebSocket, asyncio.Queue] = {}

    async def start_sender(self, websocket: WebSocket):
        """Start the sender task."""
        queue = self.message_queues.get(websocket)
        if not queue:
            return

        while True:
            message = await queue.get()
            if websocket in self.active_connections:
                try:
                    if message == "ping":
                        await websocket.send_text("pong")
                    else:
                        await websocket.send_text(message)
                except:
                    break
            else:
                break

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        try:
            data = await websocket.receive_json()
            if data['type'] == 'auth':
                token = data['token']
                decoded_token = auth.verify_id_token(token)
                user_id = decoded_token['uid']
                self.active_connections.append((user_id, websocket))
                await websocket.send_text(f"Connected as user {user_id}")
            else:
                await websocket.close(code=1008, reason="Invalid authentication")
        except Exception as e:
            await websocket.close(code=1008, reason="Authentication failed")

    async def disconnect(self, websocket: WebSocket):
        for connection in self.active_connections:
            if connection[1] == websocket:
                self.active_connections.remove(connection)
                break
        if websocket in self.sender_tasks:
            self.sender_tasks[websocket].cancel()
            await self.message_queues[websocket].put(None)
            del self.sender_tasks[websocket]
            del self.message_queues[websocket]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await self.message_queues[websocket].put(message)

    async def broadcast(self, message: str):
        for _, websocket in self.active_connections:
            await self.send_personal_message(message, websocket)

    def get_websocket_for_user(self, user_id: str) -> WebSocket:
        for uid, websocket in self.active_connections:
            if uid == user_id:
                return websocket
        return None

    async def start_streaming(self, task, report_type, report_source, source_urls, tone, websocket, headers=None):
        """Start streaming the output."""
        tone = Tone[tone]
        report = await run_agent(task, report_type, report_source, source_urls, tone, websocket, headers)
        return report


async def run_agent(task, report_type, report_source, source_urls, tone: Tone, websocket, headers=None):
    """Run the agent."""
    start_time = datetime.datetime.now()
    config_path = ""
    if report_type == "multi_agents":
        report = await run_research_task(query=task, websocket=websocket, stream_output=stream_output, tone=tone, headers=headers)
        report = report.get("report", "")
    elif report_type == ReportType.DetailedReport.value:
        researcher = DetailedReport(
            query=task,
            report_type=report_type,
            report_source=report_source,
            source_urls=source_urls,
            tone=tone,
            config_path=config_path,
            websocket=websocket,
            headers=headers
        )
        report = await researcher.run()
    else:
        researcher = BasicReport(
            query=task,
            report_type=report_type,
            report_source=report_source,
            source_urls=source_urls,
            tone=tone,
            config_path=config_path,
            websocket=websocket,
            headers=headers
        )
        report = await researcher.run()

    # measure time
    end_time = datetime.datetime.now()
    await websocket.send_json(
        {"type": "logs", "output": f"\nTotal run time: {end_time - start_time}\n"}
    )

    return report

# Load environment variables
load_dotenv()
