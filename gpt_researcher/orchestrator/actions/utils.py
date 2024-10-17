from typing import Dict, Any, Callable
from fastapi import WebSocket
from gpt_researcher.utils.logger import get_formatted_logger

# Initialize a formatted logger for consistent logging throughout the module
logger = get_formatted_logger()


async def stream_output(
    type, content, output, websocket=None, output_log=True, metadata=None
):
    """
    Streams output to the websocket and/or logs it.
    
    Args:
        type: The type of output (e.g., 'log', 'result')
        content: The content to be streamed
        output: The actual output text
        websocket: Optional WebSocket connection for real-time communication
        output_log: Boolean to determine if the output should be logged
        metadata: Additional metadata to be sent with the output

    Returns:
        None
    """
    # Log the output if required or if there's no WebSocket
    if not websocket or output_log:
        try:
            logger.info(f"{output}")
        except UnicodeEncodeError:
            # Handle Unicode encoding errors by replacing problematic characters
            logger.error(output.encode(
                'cp1252', errors='replace').decode('cp1252'))

    # If a WebSocket is provided, send the output as JSON
    if websocket:
        await websocket.send_json(
            {"type": type, "content": content,
                "output": output, "metadata": metadata}
        )


async def safe_send_json(websocket: WebSocket, data: Dict[str, Any]) -> None:
    """
    Safely send JSON data through a WebSocket connection, handling potential errors.

    Args:
        websocket (WebSocket): The WebSocket connection to send data through.
        data (Dict[str, Any]): The data to send as JSON.

    Returns:
        None
    """
    try:
        await websocket.send_json(data)
    except Exception as e:
        logger.error(f"Error sending JSON through WebSocket: {e}")


def calculate_cost(
    prompt_tokens: int,
    completion_tokens: int,
    model: str
) -> float:
    """
    Calculate the cost of API usage based on the number of tokens and the model used.

    Args:
        prompt_tokens (int): Number of tokens in the prompt.
        completion_tokens (int): Number of tokens in the completion.
        model (str): The model used for the API call.

    Returns:
        float: The calculated cost in USD.
    """
    # Define cost per 1k tokens for different models
    costs = {
        "gpt-3.5-turbo": 0.002,
        "gpt-4": 0.03,
        "gpt-4-32k": 0.06,
        # Add more models and their costs as needed
    }

    model = model.lower()
    if model not in costs:
        logger.warning(
            f"Unknown model: {model}. Cost calculation may be inaccurate.")
        return 0.0

    cost_per_1k = costs[model]
    total_tokens = prompt_tokens + completion_tokens
    return (total_tokens / 1000) * cost_per_1k


def format_token_count(count: int) -> str:
    """
    Format the token count with commas for better readability.

    Args:
        count (int): The token count to format.

    Returns:
        str: The formatted token count.
    """
    return f"{count:,}"


async def update_cost(
    prompt_tokens: int,
    completion_tokens: int,
    model: str,
    websocket: WebSocket
) -> None:
    """
    Update and send the cost information through the WebSocket.

    Args:
        prompt_tokens (int): Number of tokens in the prompt.
        completion_tokens (int): Number of tokens in the completion.
        model (str): The model used for the API call.
        websocket (WebSocket): The WebSocket connection to send data through.

    Returns:
        None
    """
    # Calculate the cost and total tokens
    cost = calculate_cost(prompt_tokens, completion_tokens, model)
    total_tokens = prompt_tokens + completion_tokens

    # Send the cost information as JSON through the WebSocket
    await safe_send_json(websocket, {
        "type": "cost",
        "data": {
            "total_tokens": format_token_count(total_tokens),
            "prompt_tokens": format_token_count(prompt_tokens),
            "completion_tokens": format_token_count(completion_tokens),
            "total_cost": f"${cost:.4f}"
        }
    })


def create_cost_callback(websocket: WebSocket) -> Callable:
    """
    Create a callback function for updating costs.

    This function returns another function that can be used as a callback
    to update costs whenever an API call is made.

    Args:
        websocket (WebSocket): The WebSocket connection to send data through.

    Returns:
        Callable: A callback function that can be used to update costs.
    """
    async def cost_callback(
        prompt_tokens: int,
        completion_tokens: int,
        model: str
    ) -> None:
        await update_cost(prompt_tokens, completion_tokens, model, websocket)

    return cost_callback
