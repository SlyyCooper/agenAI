# This file defines the BasicReport class, which is responsible for generating a basic research report
# using the GPTResearcher. It's a key component in the backend's report generation system.

from fastapi import WebSocket

from gpt_researcher.orchestrator.agent import GPTResearcher
from gpt_researcher.utils.enum import Tone


class BasicReport:
    """
    BasicReport class handles the creation and execution of a basic research report.
    It acts as a wrapper around the GPTResearcher, providing a simplified interface
    for report generation.
    """

    def __init__(
        self,
        query: str,
        report_type: str,
        report_source: str,
        source_urls,
        tone: Tone,
        config_path: str,
        websocket: WebSocket,
        headers=None
    ):
        """
        Initialize the BasicReport with necessary parameters for research and report generation.
        
        :param query: The research question or topic
        :param report_type: The type of report to generate
        :param report_source: The source of information for the report
        :param source_urls: List of URLs to use as sources
        :param tone: The tone of the report (e.g., formal, casual)
        :param config_path: Path to the configuration file
        :param websocket: WebSocket connection for real-time communication
        :param headers: Additional headers for API requests
        """
        self.query = query
        self.report_type = report_type
        self.report_source = report_source
        self.source_urls = source_urls
        self.tone = tone
        self.config_path = config_path
        self.websocket = websocket
        self.headers = headers or {}

    async def run(self):
        """
        Execute the research process and generate the report.
        
        This method creates a GPTResearcher instance, conducts the research,
        and returns the generated report.
        
        :return: The generated research report
        """
        # Initialize researcher with all necessary parameters
        researcher = GPTResearcher(
            query=self.query,
            report_type=self.report_type,
            report_source=self.report_source,
            source_urls=self.source_urls,
            tone=self.tone,
            config_path=self.config_path,
            websocket=self.websocket,
            headers=self.headers
        )

        # Conduct the research asynchronously
        await researcher.conduct_research()
        
        # Generate and return the report
        report = await researcher.write_report()
        return report

# Big Picture:
# This BasicReport class is part of the backend's report generation system.
# It integrates with the GPTResearcher to provide a streamlined process for
# creating research reports based on user queries. The class handles the setup
# and execution of the research process, making it easier for other parts of
# the application to request and receive generated reports.
#
# The use of WebSocket allows for real-time communication during the research
# process, potentially enabling progress updates to be sent to the client.
# This class serves as a bridge between the user interface (which might be
# sending requests through the FastAPI server) and the core research logic
# implemented in the GPTResearcher.
