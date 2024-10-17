# Import necessary libraries and modules
from dotenv import load_dotenv  # For loading environment variables
import sys
import os
import uuid
# Add the parent directory to the Python path to allow imports from sibling directories
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from multi_agents.agents import ChiefEditorAgent  # Import the main agent for research tasks
import asyncio  # For asynchronous programming
import json
from gpt_researcher.utils.enum import Tone  # Import Tone enum for setting research tone

# Enable LangSmith tracing if the API key is set in the environment
if os.environ.get("LANGCHAIN_API_KEY"):
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
load_dotenv()  # Load environment variables from .env file

def open_task():
    """
    Open and load the task configuration from a JSON file.
    
    Returns:
        dict: The task configuration loaded from task.json
    
    Raises:
        Exception: If no task is found in the JSON file
    """
    # Get the directory of the current script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Construct the absolute path to task.json
    task_json_path = os.path.join(current_dir, 'task.json')
    
    # Open and load the JSON file
    with open(task_json_path, 'r') as f:
        task = json.load(f)

    # Raise an exception if no task is found
    if not task:
        raise Exception("No task found. Please ensure a valid task.json file is present in the multi_agents directory and contains the necessary task information.")

    return task

async def run_research_task(query, websocket=None, stream_output=None, tone=Tone.Objective, headers=None):
    """
    Run a research task asynchronously.
    
    Args:
        query (str): The research query
        websocket: WebSocket connection for real-time communication (optional)
        stream_output: Function to stream output (optional)
        tone (Tone): The tone of the research (default: Objective)
        headers: HTTP headers (optional)
    
    Returns:
        str: The generated research report
    """
    task = open_task()
    task["query"] = query

    # Create a ChiefEditorAgent instance with the task and optional parameters
    chief_editor = ChiefEditorAgent(task, websocket, stream_output, tone, headers)
    # Run the research task and get the report
    research_report = await chief_editor.run_research_task()

    # If websocket and stream_output are provided, stream the research report
    if websocket and stream_output:
        await stream_output("logs", "research_report", research_report, websocket)

    return research_report

async def main():
    """
    Main function to run a research task without external inputs.
    
    Returns:
        str: The generated research report
    """
    task = open_task()

    # Create a ChiefEditorAgent instance with the task
    chief_editor = ChiefEditorAgent(task)
    # Run the research task with a unique task ID and get the report
    research_report = await chief_editor.run_research_task(task_id=uuid.uuid4())

    return research_report

# Entry point of the script
if __name__ == "__main__":
    # Run the main function asynchronously
    asyncio.run(main())