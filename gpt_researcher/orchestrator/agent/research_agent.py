# Import necessary modules and classes
from typing import Optional, List, Dict, Any, Set

from gpt_researcher.config import Config
from gpt_researcher.memory import Memory
from gpt_researcher.utils.enum import ReportSource, ReportType, Tone
from gpt_researcher.llm_provider import GenericLLMProvider
from gpt_researcher.orchestrator.agent.research_conductor import ResearchConductor
from gpt_researcher.orchestrator.agent.report_scraper import ReportScraper
from gpt_researcher.orchestrator.agent.report_generator import ReportGenerator
from gpt_researcher.orchestrator.agent.context_manager import ContextManager
from gpt_researcher.orchestrator.actions import get_retrievers, choose_agent

# Define the main GPTResearcher class
class GPTResearcher:
    def __init__(
        self,
        query: str,
        report_type: str = ReportType.ResearchReport.value,
        report_format: str = "markdown",
        report_source: str = ReportSource.Web.value,
        tone: Tone = Tone.Objective,
        source_urls=None,
        documents=None,
        vector_store=None,
        vector_store_filter=None,
        config_path=None,
        websocket=None,
        agent=None,
        role=None,
        parent_query: str = "",
        subtopics: list = [],
        visited_urls: set = set(),
        verbose: bool = True,
        context=[],
        headers: dict = None,
        max_subtopics: int = 5,
    ):
        # Initialize instance variables with provided or default values
        self.query = query
        self.report_type = report_type
        self.cfg = Config(config_path)
        self.llm = GenericLLMProvider(self.cfg)
        self.report_source = getattr(
            self.cfg, 'report_source', None) or report_source
        self.report_format = report_format
        self.max_subtopics = max_subtopics
        self.tone = tone if isinstance(tone, Tone) else Tone.Objective
        self.source_urls = source_urls
        self.documents = documents
        self.vector_store = vector_store
        self.vector_store_filter = vector_store_filter
        self.websocket = websocket
        self.agent = agent
        self.role = role
        self.parent_query = parent_query
        self.subtopics = subtopics
        self.visited_urls = visited_urls
        self.verbose = verbose
        self.context = context
        self.headers = headers or {}
        self.research_costs = 0.0
        self.retrievers = get_retrievers(self.headers, self.cfg)
        self.memory = Memory(
            getattr(self.cfg, 'embedding_provider', None), self.headers)

        # Initialize components for research, report generation, scraping, and context management
        self.research_conductor = ResearchConductor(self)
        self.report_generator = ReportGenerator(self)
        self.scraper = ReportScraper(self)
        self.context_manager = ContextManager(self)

    # Method to conduct research
    async def conduct_research(self):
        # If agent and role are not set, choose them based on the query
        if not (self.agent and self.role):
            self.agent, self.role = await choose_agent(
                query=self.query,
                cfg=self.cfg,
                parent_query=self.parent_query,
                cost_callback=self.add_costs,
                headers=self.headers,
            )

        # Conduct research and update context
        self.context = await self.research_conductor.conduct_research()
        return self.context

    # Method to write the research report
    async def write_report(self, existing_headers: list = [], relevant_written_contents: list = [], ext_context=None) -> str:
        return await self.report_generator.write_report(
            existing_headers,
            relevant_written_contents,
            ext_context or self.context
        )

    # Method to write the report conclusion
    async def write_report_conclusion(self, report_body: str) -> str:
        return await self.report_generator.write_report_conclusion(report_body)

    # Method to write the report introduction
    async def write_introduction(self):
        return await self.report_generator.write_introduction()

    # Method to get subtopics for the research
    async def get_subtopics(self):
        return await self.report_generator.get_subtopics()

    # Method to get draft section titles for a subtopic
    async def get_draft_section_titles(self, current_subtopic: str):
        return await self.report_generator.get_draft_section_titles(current_subtopic)

    # Method to get similar written contents based on draft section titles
    async def get_similar_written_contents_by_draft_section_titles(
        self,
        current_subtopic: str,
        draft_section_titles: List[str],
        written_contents: List[Dict],
        max_results: int = 10
    ) -> List[str]:
        return await self.context_manager.get_similar_written_contents_by_draft_section_titles(
            current_subtopic,
            draft_section_titles,
            written_contents,
            max_results
        )

    # Utility methods

    # Method to get the list of visited URLs
    def get_source_urls(self) -> list:
        return list(self.visited_urls)

    # Method to get the current research context
    def get_research_context(self) -> list:
        return self.context

    # Method to get the total research costs
    def get_costs(self) -> float:
        return self.research_costs

    # Method to set the verbose mode
    def set_verbose(self, verbose: bool):
        self.verbose = verbose

    # Method to add costs to the total research costs
    def add_costs(self, cost: float) -> None:
        if not isinstance(cost, (float, int)):
            raise ValueError("Cost must be an integer or float")
        self.research_costs += cost