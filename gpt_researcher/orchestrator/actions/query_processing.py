import json
import re
import json_repair
from typing import List, Dict, Any
from gpt_researcher.config.config import Config
from gpt_researcher.utils.llm import create_chat_completion
from gpt_researcher.orchestrator.prompts import auto_agent_instructions, generate_search_queries_prompt

# This function chooses an appropriate AI agent based on the given query
async def choose_agent(
    query, cfg, parent_query=None, cost_callback: callable = None, headers=None
):
    """
    Chooses the agent automatically based on the given query.
    Args:
        parent_query: The main context query if this is a subtopic.
        query: The original query to be researched.
        cfg: Configuration object containing settings.
        cost_callback: A function to calculate and track LLM usage costs.
        headers: Optional HTTP headers.

    Returns:
        agent: The name of the chosen agent.
        agent_role_prompt: The role prompt for the chosen agent.
    """
    # Combine parent_query and query if parent_query exists
    query = f"{parent_query} - {query}" if parent_query else f"{query}"
    response = None  # Initialize response to ensure it's defined

    try:
        # Use LLM to determine the most suitable agent
        response = await create_chat_completion(
            model=cfg.smart_llm_model,
            messages=[
                {"role": "system", "content": f"{auto_agent_instructions()}"},
                {"role": "user", "content": f"task: {query}"},
            ],
            temperature=0.15,
            llm_provider=cfg.llm_provider,
            llm_kwargs=cfg.llm_kwargs,
            cost_callback=cost_callback,
        )

        # Parse the LLM's response to get the agent details
        agent_dict = json.loads(response)
        return agent_dict["server"], agent_dict["agent_role_prompt"]

    except Exception as e:
        print("⚠️ Error in reading JSON, attempting to repair JSON")
        return await handle_json_error(response)

# This function handles JSON parsing errors that may occur when choosing an agent
async def handle_json_error(response):
    try:
        # Attempt to repair and parse the JSON
        agent_dict = json_repair.loads(response)
        if agent_dict.get("server") and agent_dict.get("agent_role_prompt"):
            return agent_dict["server"], agent_dict["agent_role_prompt"]
    except Exception as e:
        print(f"Error using json_repair: {e}")

    # If json_repair fails, try extracting JSON using regex
    json_string = extract_json_with_regex(response)
    if json_string:
        try:
            json_data = json.loads(json_string)
            return json_data["server"], json_data["agent_role_prompt"]
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")

    # If all parsing attempts fail, return a default agent
    print("No JSON found in the string. Falling back to Default Agent.")
    return "Default Agent", (
        "You are an AI critical thinker research assistant. Your sole purpose is to write well written, "
        "critically acclaimed, objective and structured reports on given text."
    )

# This function uses regex to extract JSON from a string
def extract_json_with_regex(response):
    json_match = re.search(r"{.*?}", response, re.DOTALL)
    if json_match:
        return json_match.group(0)
    return None

# This function generates sub-queries for more detailed research
async def get_sub_queries(
    query: str,
    agent_role_prompt: str,
    cfg,
    parent_query: str,
    report_type: str,
    cost_callback: callable = None,
):
    """
    Generates sub-queries for more detailed research based on the main query.
    Args:
        query: The original query to be researched.
        agent_role_prompt: The role prompt for the chosen agent.
        cfg: Configuration object containing settings.
        parent_query: The main context query if this is a subtopic.
        report_type: The type of report to be generated.
        cost_callback: A function to calculate and track LLM usage costs.

    Returns:
        sub_queries: A list of generated sub-queries for further research.
    """
    # Determine the maximum number of research iterations
    max_research_iterations = cfg.max_iterations if cfg.max_iterations else 1
    
    # Use LLM to generate sub-queries
    response = await create_chat_completion(
        model=cfg.smart_llm_model,
        messages=[
            {"role": "system", "content": f"{agent_role_prompt}"},
            {
                "role": "user",
                "content": generate_search_queries_prompt(
                    query,
                    parent_query,
                    report_type,
                    max_iterations=max_research_iterations,
                ),
            },
        ],
        temperature=0.1,
        llm_provider=cfg.llm_provider,
        llm_kwargs=cfg.llm_kwargs,
        cost_callback=cost_callback,
    )

    # Parse the LLM's response to get the sub-queries
    sub_queries = json_repair.loads(response)

    return sub_queries
