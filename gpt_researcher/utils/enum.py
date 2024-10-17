from enum import Enum

# This module defines enumerations for different aspects of the GPT Researcher application

# ReportType enum defines the various types of reports that can be generated
class ReportType(Enum):
    ResearchReport = "research_report"  # A comprehensive research report
    ResourceReport = "resource_report"  # A report listing resources
    OutlineReport = "outline_report"    # An outline or structure of a report
    CustomReport = "custom_report"      # A user-defined custom report type
    DetailedReport = "detailed_report"  # A report with in-depth details
    SubtopicReport = "subtopic_report"  # A report focusing on a specific subtopic

# ReportSource enum defines the different sources from which report data can be obtained
class ReportSource(Enum):
    Web = "web"                                  # Data sourced from web scraping
    Local = "local"                              # Data from local files or databases
    LangChainDocuments = "langchain_documents"   # Data from LangChain document loaders
    LangChainVectorStore = "langchain_vectorstore"  # Data from LangChain vector stores
    Static = "static"                            # Predefined or static data
    Hybrid = "hybrid"                            # A combination of multiple sources

# Tone enum defines various writing styles or tones that can be used in the reports
class Tone(Enum):
    Objective = "Objective (impartial and unbiased presentation of facts and findings)"
    Formal = "Formal (adheres to academic standards with sophisticated language and structure)"
    Analytical = (
        "Analytical (critical evaluation and detailed examination of data and theories)"
    )
    Persuasive = (
        "Persuasive (convincing the audience of a particular viewpoint or argument)"
    )
    Informative = (
        "Informative (providing clear and comprehensive information on a topic)"
    )
    Explanatory = "Explanatory (clarifying complex concepts and processes)"
    Descriptive = (
        "Descriptive (detailed depiction of phenomena, experiments, or case studies)"
    )
    Critical = "Critical (judging the validity and relevance of the research and its conclusions)"
    Comparative = "Comparative (juxtaposing different theories, data, or methods to highlight differences and similarities)"
    Speculative = "Speculative (exploring hypotheses and potential implications or future research directions)"
    Reflective = "Reflective (considering the research process and personal insights or experiences)"
    Narrative = (
        "Narrative (telling a story to illustrate research findings or methodologies)"
    )
    Humorous = "Humorous (light-hearted and engaging, usually to make the content more relatable)"
    Optimistic = "Optimistic (highlighting positive findings and potential benefits)"
    Pessimistic = (
        "Pessimistic (focusing on limitations, challenges, or negative outcomes)"
    )
