import asyncio
from typing import List, Dict, Any

from colorama import Fore, Style
from gpt_researcher.config.config import Config
from gpt_researcher.utils.llm import create_chat_completion
from gpt_researcher.utils.logger import get_formatted_logger
from gpt_researcher.orchestrator.prompts import (
    generate_report_introduction,
    generate_draft_titles_prompt,
    generate_report_conclusion,
    get_prompt_by_report_type,
)
from gpt_researcher.utils.enum import Tone

# Initialize a formatted logger for consistent logging throughout the module
logger = get_formatted_logger()


async def get_report_introduction(
    query: str,
    context: str,
    role: str,
    config: Config,
    websocket=None,
    cost_callback: callable = None
) -> str:
    """
    Generate an introduction for the report.

    This function uses the LLM to create an introduction based on the given query and context.
    It utilizes the agent's role and configuration settings to tailor the output.

    Args:
        query (str): The research query.
        context (str): Context for the report.
        role (str): The role of the agent.
        config (Config): Configuration object.
        websocket: WebSocket connection for streaming output.
        cost_callback (callable, optional): Callback for calculating LLM costs.

    Returns:
        str: The generated introduction.
    """
    try:
        # Use the LLM to generate the introduction
        introduction = await create_chat_completion(
            model=config.smart_llm_model,
            messages=[
                {"role": "system", "content": f"{role}"},
                {"role": "user", "content": generate_report_introduction(
                    query, context)},
            ],
            temperature=0.25,
            llm_provider=config.llm_provider,
            stream=True,
            websocket=websocket,
            max_tokens=config.smart_token_limit,
            llm_kwargs=config.llm_kwargs,
            cost_callback=cost_callback,
        )
        return introduction
    except Exception as e:
        logger.error(f"Error in generating report introduction: {e}")
    return ""


async def write_conclusion(
    query: str,
    context: str,
    role: str,
    config: Config,
    websocket=None,
    cost_callback: callable = None
) -> str:
    """
    Write a conclusion for the report.

    This function uses the LLM to create a conclusion based on the given query and context.
    It follows a similar pattern to the introduction generation.

    Args:
        query (str): The research query.
        context (str): Context for the report.
        role (str): The role of the agent.
        config (Config): Configuration object.
        websocket: WebSocket connection for streaming output.
        cost_callback (callable, optional): Callback for calculating LLM costs.

    Returns:
        str: The generated conclusion.
    """
    try:
        # Use the LLM to generate the conclusion
        conclusion = await create_chat_completion(
            model=config.smart_llm_model,
            messages=[
                {"role": "system", "content": f"{role}"},
                {"role": "user", "content": generate_report_conclusion(
                    query, context)},
            ],
            temperature=0.25,
            llm_provider=config.llm_provider,
            stream=True,
            websocket=websocket,
            max_tokens=config.smart_token_limit,
            llm_kwargs=config.llm_kwargs,
            cost_callback=cost_callback,
        )
        return conclusion
    except Exception as e:
        logger.error(f"Error in writing conclusion: {e}")
    return ""


async def summarize_url(
    url: str,
    content: str,
    role: str,
    config: Config,
    websocket=None,
    cost_callback: callable = None
) -> str:
    """
    Summarize the content of a URL.

    This function uses the LLM to create a summary of the content from a given URL.
    It's useful for condensing information from web sources.

    Args:
        url (str): The URL to summarize.
        content (str): The content of the URL.
        role (str): The role of the agent.
        config (Config): Configuration object.
        websocket: WebSocket connection for streaming output.
        cost_callback (callable, optional): Callback for calculating LLM costs.

    Returns:
        str: The summarized content.
    """
    try:
        # Use the LLM to generate the summary
        summary = await create_chat_completion(
            model=config.smart_llm_model,
            messages=[
                {"role": "system", "content": f"{role}"},
                {"role": "user", "content": f"Summarize the following content from {url}:\n\n{content}"},
            ],
            temperature=0.25,
            llm_provider=config.llm_provider,
            stream=True,
            websocket=websocket,
            max_tokens=config.smart_token_limit,
            llm_kwargs=config.llm_kwargs,
            cost_callback=cost_callback,
        )
        return summary
    except Exception as e:
        logger.error(f"Error in summarizing URL: {e}")
    return ""


async def generate_draft_section_titles(
    query: str,
    current_subtopic: str,
    context: str,
    role: str,
    config: Config,
    websocket=None,
    cost_callback: callable = None
) -> List[str]:
    """
    Generate draft section titles for the report.

    This function uses the LLM to create a list of potential section titles
    based on the query, current subtopic, and context.

    Args:
        query (str): The research query.
        current_subtopic (str): The current subtopic being addressed.
        context (str): Context for the report.
        role (str): The role of the agent.
        config (Config): Configuration object.
        websocket: WebSocket connection for streaming output.
        cost_callback (callable, optional): Callback for calculating LLM costs.

    Returns:
        List[str]: A list of generated section titles.
    """
    try:
        # Use the LLM to generate section titles
        section_titles = await create_chat_completion(
            model=config.smart_llm_model,
            messages=[
                {"role": "system", "content": f"{role}"},
                {"role": "user", "content": generate_draft_titles_prompt(
                    current_subtopic, query, context)},
            ],
            temperature=0.25,
            llm_provider=config.llm_provider,
            stream=True,
            websocket=None,
            max_tokens=config.smart_token_limit,
            llm_kwargs=config.llm_kwargs,
            cost_callback=cost_callback,
        )
        return section_titles.split("\n")
    except Exception as e:
        logger.error(f"Error in generating draft section titles: {e}")
    return []


async def generate_report(
    query: str,
    context,
    agent_role_prompt: str,
    report_type: str,
    tone: Tone,
    report_source: str,
    websocket,
    cfg,
    main_topic: str = "",
    existing_headers: list = [],
    relevant_written_contents: list = [],
    cost_callback: callable = None,
    headers=None,
):
    """
    Generates the final report based on the provided parameters and context.

    This function is the main driver for creating the complete report. It uses
    different prompts based on the report type and combines all the gathered
    information to produce a coherent output.

    Args:
        query (str): The main research query.
        context: The context information for the report.
        agent_role_prompt (str): The role prompt for the agent.
        report_type (str): The type of report to generate.
        tone (Tone): The desired tone of the report.
        report_source (str): The source of the report data.
        websocket: WebSocket connection for streaming output.
        cfg: Configuration object.
        main_topic (str): The main topic of the report (if applicable).
        existing_headers (list): List of existing headers (if any).
        relevant_written_contents (list): List of relevant content already written.
        cost_callback (callable, optional): Callback for calculating LLM costs.
        headers: Additional headers (if any).

    Returns:
        str: The generated report.
    """
    # Get the appropriate prompt based on the report type
    generate_prompt = get_prompt_by_report_type(report_type)
    report = ""

    # Prepare the content for the LLM based on the report type
    if report_type == "subtopic_report":
        content = f"{generate_prompt(query, existing_headers, relevant_written_contents, main_topic, context, report_format=cfg.report_format, tone=tone, total_words=cfg.total_words)}"
    else:
        content = f"{generate_prompt(query, context, report_source, report_format=cfg.report_format, tone=tone, total_words=cfg.total_words)}"
    
    try:
        # Use the LLM to generate the final report
        report = await create_chat_completion(
            model=cfg.smart_llm_model,
            messages=[
                {"role": "system", "content": f"{agent_role_prompt}"},
                {"role": "user", "content": content},
            ],
            temperature=0.35,
            llm_provider=cfg.llm_provider,
            stream=True,
            websocket=websocket,
            max_tokens=cfg.smart_token_limit,
            llm_kwargs=cfg.llm_kwargs,
            cost_callback=cost_callback,
        )
    except Exception as e:
        print(f"{Fore.RED}Error in generate_report: {e}{Style.RESET_ALL}")

    return report