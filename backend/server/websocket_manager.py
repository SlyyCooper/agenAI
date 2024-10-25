import asyncio
import datetime
from typing import Dict, List
from dotenv import load_dotenv

from fastapi import WebSocket, logger

from backend.report_type import BasicReport, DetailedReport
from gpt_researcher.utils.enum import ReportType, Tone
from multi_agents.main import run_research_task
from gpt_researcher.orchestrator.actions import stream_output  # Import stream_output
from backend.server.firebase.firebase_utils import get_user_data, verify_firebase_token
from backend.server.firebase.firebase_init import db


class WebSocketManager:
    """Manage websockets"""

    def __init__(self):
        """Initialize the WebSocketManager class."""
        self.active_connections: List[WebSocket] = []
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
        """Connect a websocket."""
        await websocket.accept()
        try:
            auth_message = await websocket.receive_json()
            if auth_message['type'] == 'auth':
                token = auth_message['token']
                decoded_token = await verify_firebase_token(token)
                if not decoded_token:
                    await websocket.close(code=1008)
                    return
                
                user_id = decoded_token['uid']
                user_data = await get_user_data(user_id)
                
                if not user_data or user_data.get('tokens', 0) <= 0:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No tokens available. Please purchase more to continue."
                    })
                    await websocket.close(code=1008)
                    return
                
                websocket.user_id = user_id
            else:
                await websocket.close(code=1008)
                return
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            await websocket.close(code=1008)
            return

        self.active_connections.append(websocket)
        self.message_queues[websocket] = asyncio.Queue()
        self.sender_tasks[websocket] = asyncio.create_task(
            self.start_sender(websocket))

    async def disconnect(self, websocket: WebSocket):
        """Disconnect a websocket."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            self.sender_tasks[websocket].cancel()
            await self.message_queues[websocket].put(None)
            del self.sender_tasks[websocket]
            del self.message_queues[websocket]

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
