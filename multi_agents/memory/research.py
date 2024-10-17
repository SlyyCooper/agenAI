# Import necessary types and modules
from typing import TypedDict, List, Annotated
import operator

# Define a custom type for representing the state of a research task
class ResearchState(TypedDict):
    # The original task details
    task: dict
    # Initial research findings or summary
    initial_research: str
    # List of sections in the research report
    sections: List[str]
    # Detailed research data, likely containing information for each section
    research_data: List[dict]
    # Any feedback provided by a human during the research process
    human_feedback: str
    
    # Report layout components
    # Title of the research report
    title: str
    # Dictionary containing headers for different sections
    headers: dict
    # Date of the report
    date: str
    # Table of contents for the report
    table_of_contents: str
    # Introduction section of the report
    introduction: str
    # Conclusion section of the report
    conclusion: str
    # List of sources used in the research
    sources: List[str]
    # The complete generated report
    report: str

# This ResearchState class provides a structured way to store and manage
# all the components of a research task, from initial data to the final report.
# It helps in organizing the research process and ensures all necessary
# elements are accounted for in the final output.
