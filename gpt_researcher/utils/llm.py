# Import necessary libraries and modules
from __future__ import annotations

import json
import logging
from typing import Optional, Any, Dict

from colorama import Fore, Style
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate

from gpt_researcher.orchestrator.prompts import generate_subtopics_prompt
from .costs import estimate_llm_cost
from .validators import Subtopics

# Function to get the appropriate LLM provider based on the input
def get_llm(llm_provider, **kwargs):
    from gpt_researcher.llm_provider import GenericLLMProvider
    return GenericLLMProvider.from_provider(llm_provider, **kwargs)

# Asynchronous function to create a chat completion
async def create_chat_completion(
        messages: list,  # type: ignore
        model: Optional[str] = None,
        temperature: float = 0.4,
        max_tokens: Optional[int] = 4000,
        llm_provider: Optional[str] = None,
        stream: Optional[bool] = False,
        websocket: Any | None = None,
        llm_kwargs: Dict[str, Any] | None = None,
        cost_callback: callable = None
) -> str:
    """Create a chat completion using the specified LLM provider
    Args:
        messages (list[dict[str, str]]): The messages to send to the chat completion
        model (str, optional): The model to use. Defaults to None.
        temperature (float, optional): The temperature to use. Defaults to 0.4.
        max_tokens (int, optional): The max tokens to use. Defaults to 4000.
        stream (bool, optional): Whether to stream the response. Defaults to False.
        llm_provider (str, optional): The LLM Provider to use.
        websocket (WebSocket): The websocket used in the current request,
        cost_callback: Callback function for updating cost
    Returns:
        str: The response from the chat completion
    """
    # Validate input parameters
    if model is None:
        raise ValueError("Model cannot be None")
    if max_tokens is not None and max_tokens > 8001:
        raise ValueError(
            f"Max tokens cannot be more than 8001, but got {max_tokens}")

    # Get the provider from supported providers
    provider = get_llm(llm_provider, model=model, temperature=temperature,
                       max_tokens=max_tokens, **(llm_kwargs or {}))

    response = ""
    # Attempt to get a response up to 10 times
    for _ in range(10):
        response = await provider.get_chat_response(
            messages, stream, websocket
        )

        # If a cost callback is provided, estimate and update the cost
        if cost_callback:
            llm_costs = estimate_llm_cost(str(messages), response)
            cost_callback(llm_costs)

        return response

    # If all attempts fail, log an error and raise an exception
    logging.error(f"Failed to get response from {llm_provider} API")
    raise RuntimeError(f"Failed to get response from {llm_provider} API")

# Asynchronous function to construct subtopics based on a given task and data
async def construct_subtopics(task: str, data: str, config, subtopics: list = []) -> list:
    """
    Construct subtopics based on the given task and data.

    Args:
        task (str): The main task or topic.
        data (str): Additional data for context.
        config: Configuration settings.
        subtopics (list, optional): Existing subtopics. Defaults to [].

    Returns:
        list: A list of constructed subtopics.
    """
    try:
        # Create a PydanticOutputParser for the Subtopics model
        parser = PydanticOutputParser(pydantic_object=Subtopics)

        # Create a PromptTemplate for generating subtopics
        prompt = PromptTemplate(
            template=generate_subtopics_prompt(),
            input_variables=["task", "data", "subtopics", "max_subtopics"],
            partial_variables={
                "format_instructions": parser.get_format_instructions()},
        )

        print(f"\n🤖 Calling {config.smart_llm_model}...\n")

        # Set the temperature for the LLM
        temperature = config.temperature
        # Note: temperature throughout the code base is currently set to Zero

        # Get the LLM provider
        provider = get_llm(config.llm_provider, model=config.smart_llm_model,
                           temperature=temperature, max_tokens=config.smart_token_limit, **config.llm_kwargs)
        model = provider.llm

        # Create a chain of prompt, model, and parser
        chain = prompt | model | parser

        # Invoke the chain with the input data
        output = chain.invoke({
            "task": task,
            "data": data,
            "subtopics": subtopics,
            "max_subtopics": config.max_subtopics
        })

        return output

    except Exception as e:
        # If an exception occurs, print it and return the original subtopics
        print("Exception in parsing subtopics : ", e)
        return subtopics