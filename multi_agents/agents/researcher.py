# Import necessary modules and classes
from gpt_researcher import GPTResearcher
from colorama import Fore, Style
from .utils.views import print_agent_output

# Define the ResearchAgent class
class ResearchAgent:
    def __init__(self, websocket=None, stream_output=None, tone=None, headers=None):
        # Initialize the ResearchAgent with optional parameters
        self.websocket = websocket
        self.stream_output = stream_output
        self.headers = headers or {}
        self.tone = tone

    async def research(self, query: str, research_report: str = "research_report",
                       parent_query: str = "", verbose=True, source="web", tone=None, headers=None):
        # Initialize the GPTResearcher with the given parameters
        researcher = GPTResearcher(query=query, report_type=research_report, parent_query=parent_query,
                                   verbose=verbose, report_source=source, tone=tone, websocket=self.websocket, headers=self.headers)
        # Conduct research on the given query
        await researcher.conduct_research()
        # Write and return the research report
        report = await researcher.write_report()
        return report

    async def run_subtopic_research(self, parent_query: str, subtopic: str, verbose: bool = True, source="web", headers=None):
        try:
            # Conduct research on a subtopic
            report = await self.research(parent_query=parent_query, query=subtopic,
                                         research_report="subtopic_report", verbose=verbose, source=source, tone=self.tone, headers=None)
        except Exception as e:
            # Handle and print any errors that occur during research
            print(f"{Fore.RED}Error in researching topic {subtopic}: {e}{Style.RESET_ALL}")
            report = None
        # Return the subtopic and its corresponding report
        return {subtopic: report}

    async def run_initial_research(self, research_state: dict):
        # Extract task information from the research state
        task = research_state.get("task")
        query = task.get("query")
        source = task.get("source", "web")

        # Output research information based on the output method (websocket or print)
        if self.websocket and self.stream_output:
            await self.stream_output("logs", "initial_research", f"Running initial research on the following query: {query}", self.websocket)
        else:
            print_agent_output(f"Running initial research on the following query: {query}", agent="RESEARCHER")
        
        # Conduct and return the initial research
        return {"task": task, "initial_research": await self.research(query=query, verbose=task.get("verbose"),
                                                                      source=source, tone=self.tone, headers=self.headers)}

    async def run_depth_research(self, draft_state: dict):
        # Extract information from the draft state
        task = draft_state.get("task")
        topic = draft_state.get("topic")
        parent_query = task.get("query")
        source = task.get("source", "web")
        verbose = task.get("verbose")

        # Output research information based on the output method (websocket or print)
        if self.websocket and self.stream_output:
            await self.stream_output("logs", "depth_research", f"Running in depth research on the following report topic: {topic}", self.websocket)
        else:
            print_agent_output(f"Running in depth research on the following report topic: {topic}", agent="RESEARCHER")
        
        # Conduct in-depth research on the topic and return the results
        research_draft = await self.run_subtopic_research(parent_query=parent_query, subtopic=topic,
                                                          verbose=verbose, source=source, headers=self.headers)
        return {"draft": research_draft}