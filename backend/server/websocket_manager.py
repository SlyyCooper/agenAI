import asyncio
import datetime
import json
from typing import Dict, List, Optional
from enum import Enum
from dotenv import load_dotenv

from fastapi import WebSocket

from backend.report_type import BasicReport, DetailedReport
from gpt_researcher.utils.enum import ReportType, Tone
from multi_agents.main import run_research_task
from gpt_researcher.orchestrator.actions import stream_output
from backend.server.firebase.firebase import verify_firebase_token
from backend.server.firebase.firebase import db

class ConnectionState(str, Enum):
    """WebSocket connection states"""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    AUTHENTICATING = "authenticating"
    AUTHENTICATED = "authenticated"
    CLOSING = "closing"
    CLOSED = "closed"

class WebSocketManager:
    """Manage websockets with proper state management and message validation"""

    def __init__(self):
        """Initialize the WebSocketManager class."""
        self.active_connections: List[WebSocket] = []
        self.sender_tasks: Dict[WebSocket, asyncio.Task] = {}
        self.message_queues: Dict[WebSocket, asyncio.Queue] = {}
        self.connection_states: Dict[WebSocket, ConnectionState] = {}
        self.user_connections: Dict[str, List[WebSocket]] = {}

    async def set_state(self, websocket: WebSocket, state: ConnectionState):
        """Update connection state and notify client"""
        self.connection_states[websocket] = state
        try:
            await websocket.send_json({
                "type": "connection_state",
                "state": state
            })
        except Exception as e:
            print(f"Error sending state update: {str(e)}")

    async def can_send_message(self, websocket: WebSocket) -> bool:
        """Check if websocket can send messages"""
        return (websocket in self.connection_states and 
                self.connection_states[websocket] == ConnectionState.AUTHENTICATED)

    async def validate_message(self, message: str) -> Optional[dict]:
        """Validate incoming message format"""
        if not message:
            return None
            
        try:
            data = json.loads(message)
            if not isinstance(data, dict):
                raise ValueError("Message must be a JSON object")
            if "type" not in data:
                raise ValueError("Message must have a 'type' field")
            return data
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON message")

    async def start_sender(self, websocket: WebSocket):
        """Start the sender task with proper error handling."""
        queue = self.message_queues.get(websocket)
        if not queue:
            return

        while True:
            try:
                message = await queue.get()
                if message is None:  # Shutdown signal
                    break
                    
                if websocket in self.active_connections:
                    if await self.can_send_message(websocket):
                        if message == "ping":
                            await websocket.send_text("pong")
                        else:
                            await websocket.send_text(message)
                    else:
                        # Queue message if can't send yet
                        await queue.put(message)
                else:
                    break
            except Exception as e:
                print(f"Error in sender task: {str(e)}")
                break

        # Cleanup
        await self.disconnect(websocket)

    async def connect(self, websocket: WebSocket):
        """Connect a websocket with proper state management."""
        try:
            await self.set_state(websocket, ConnectionState.CONNECTING)
            await websocket.accept()
            await self.set_state(websocket, ConnectionState.CONNECTED)
            
            self.active_connections.append(websocket)
            self.message_queues[websocket] = asyncio.Queue()
            self.sender_tasks[websocket] = asyncio.create_task(
                self.start_sender(websocket)
            )
            
            # Wait for auth message with timeout
            try:
                await self.set_state(websocket, ConnectionState.AUTHENTICATING)
                auth_message = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=30.0  # Increased timeout to 30 seconds
                )
                
                if auth_message.get('type') == 'auth' and auth_message.get('token'):
                    token = auth_message['token']
                    try:
                        decoded_token = await verify_firebase_token(token)
                        if decoded_token:
                            user_id = decoded_token['uid']
                            websocket.user_id = user_id
                            
                            # Track user connections
                            if user_id not in self.user_connections:
                                self.user_connections[user_id] = []
                            self.user_connections[user_id].append(websocket)
                            
                            await self.set_state(websocket, ConnectionState.AUTHENTICATED)
                            await websocket.send_json({
                                "type": "auth",
                                "status": "success"
                            })
                            return
                        else:
                            raise ValueError("Invalid token")
                    except Exception as e:
                        raise ValueError(f"Token verification error: {str(e)}")
                else:
                    raise ValueError("Invalid auth message format")
                
            except asyncio.TimeoutError:
                raise ValueError("Authentication timeout")
                
        except Exception as e:
            error_message = str(e)
            print(f"Connection error: {error_message}")
            try:
                await websocket.send_json({
                    "type": "auth",
                    "status": "error",
                    "message": error_message
                })
            except:
                pass
            finally:
                await self.disconnect(websocket)

    async def disconnect(self, websocket: WebSocket):
        """Disconnect a websocket with proper cleanup."""
        try:
            # Update state first to prevent new messages
            await self.set_state(websocket, ConnectionState.CLOSING)
            
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
                
                # Clean up user connections
                user_id = getattr(websocket, 'user_id', None)
                if user_id and user_id in self.user_connections:
                    self.user_connections[user_id].remove(websocket)
                    if not self.user_connections[user_id]:
                        del self.user_connections[user_id]
                
                # Cancel sender task
                if websocket in self.sender_tasks:
                    self.sender_tasks[websocket].cancel()
                    await self.message_queues[websocket].put(None)
                    del self.sender_tasks[websocket]
                    del self.message_queues[websocket]
                
                # Clean up state
                if websocket in self.connection_states:
                    del self.connection_states[websocket]
                
                await self.set_state(websocket, ConnectionState.CLOSED)
                await websocket.close()
        except Exception as e:
            print(f"Error in disconnect: {str(e)}")

    async def handle_message(self, websocket: WebSocket, message: str):
        """Handle incoming WebSocket message with validation."""
        try:
            if not await self.can_send_message(websocket):
                raise ValueError("Connection not authenticated")
                
            data = await self.validate_message(message)
            if data:
                await self.process_message(websocket, data)
        except Exception as e:
            error_message = str(e)
            print(f"Error processing message: {error_message}")
            try:
                await websocket.send_json({
                    "type": "error",
                    "message": error_message
                })
            except:
                # If we can't send the error, disconnect
                await self.disconnect(websocket)

    async def process_message(self, websocket: WebSocket, data: dict):
        """Process validated message based on type."""
        message_type = data.get('type')
        
        if message_type == 'research_request':
            await self.handle_research_request(websocket, data)
        elif message_type == 'ping':
            await websocket.send_json({"type": "pong"})
        else:
            raise ValueError(f"Unknown message type: {message_type}")

    async def handle_research_request(self, websocket: WebSocket, data: dict):
        """Handle research request with proper validation."""
        try:
            query = data.get('query')
            settings = data.get('settings', {})
            
            if not query:
                raise ValueError("Research query is required")
            
            # Get user_id from websocket
            user_id = getattr(websocket, 'user_id', None)
            if not user_id:
                raise ValueError("No user ID found")
            
            # Process research request
            report = await self.start_streaming(
                query,
                settings.get('report_type', 'research_report'),
                settings.get('report_source', 'web'),
                settings.get('source_urls', []),
                settings.get('tone', 'professional'),
                websocket
            )
            
            return report
            
        except Exception as e:
            error_message = str(e)
            print(f"Error processing research request: {error_message}")
            await websocket.send_json({
                "type": "error",
                "message": error_message
            })

    async def start_streaming(self, task, report_type, report_source, source_urls, tone, websocket, headers=None):
        """Start streaming with proper error handling."""
        try:
            tone_enum = Tone[tone]
            report = await run_agent(task, report_type, report_source, source_urls, tone_enum, websocket, headers)
            return report
        except Exception as e:
            error_message = str(e)
            print(f"Error in streaming: {error_message}")
            await websocket.send_json({
                "type": "error",
                "message": error_message
            })
            return None

# Load environment variables
load_dotenv()

async def run_agent(task, report_type, report_source, source_urls, tone: Tone, websocket, headers=None):
    """Run the agent with proper error handling."""
    try:
        start_time = datetime.datetime.now()
        config_path = ""
        
        if report_type == "multi_agents":
            report = await run_research_task(
                query=task,
                websocket=websocket,
                stream_output=stream_output,
                tone=tone,
                headers=headers
            )
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

        # Measure time
        end_time = datetime.datetime.now()
        await websocket.send_json({
            "type": "logs",
            "output": f"\nTotal run time: {end_time - start_time}\n"
        })

        # Get user_id from websocket
        user_id = getattr(websocket, 'user_id', None)
        if not user_id:
            raise ValueError("No user ID found")
        
        return {
            "report": report,
            "user_id": user_id
        }
        
    except Exception as e:
        error_message = str(e)
        print(f"Error running agent: {error_message}")
        await websocket.send_json({
            "type": "error",
            "message": error_message
        })
        return None
