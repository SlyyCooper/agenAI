# Import necessary libraries
import json5 as json
import json_repair
from langchain_community.adapters.openai import convert_openai_messages

# Import custom modules and configurations
from gpt_researcher.config.config import Config
from gpt_researcher.orchestrator.actions.query_processing import handle_json_error
from gpt_researcher.utils.llm import create_chat_completion

# Import logging library
from loguru import logger

# Define an asynchronous function to call the language model
async def call_model(
    prompt: list,
    model: str,
    response_format: str = None,
):
    # Initialize optional parameters
    optional_params = {}
    # If JSON response is expected, set the appropriate format
    if response_format == "json":
        optional_params = {"response_format": {"type": "json_object"}}

    # Load configuration
    cfg = Config()
    # Convert the prompt to the format expected by the language model
    lc_messages = convert_openai_messages(prompt)

    try:
        # Attempt to create a chat completion using the specified model and parameters
        response = await create_chat_completion(
            model=model,
            messages=lc_messages,
            temperature=0,  # Set temperature to 0 for deterministic output
            llm_provider=cfg.llm_provider,
            llm_kwargs=cfg.llm_kwargs,
            # cost_callback=cost_callback,  # Commented out, possibly for future use
        )

        # If JSON response is expected, process the response accordingly
        if response_format == "json":
            try:
                # Remove any JSON code block markers and parse the JSON
                cleaned_json_string = response.strip("```json\n")
                return json.loads(cleaned_json_string)
            except Exception as e:
                # If JSON parsing fails, attempt to repair the JSON
                print("⚠️ Error in reading JSON, attempting to repair JSON")
                logger.error(
                    f"Error in reading JSON, attempting to repair reponse: {response}"
                )
                return json_repair.loads(response)
        else:
            # If not JSON, return the response as is
            return response

    except Exception as e:
        # Log any errors that occur during the model call
        print("⚠️ Error in calling model")
        logger.error(f"Error in calling model: {e}")
