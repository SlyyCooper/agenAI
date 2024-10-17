# Import necessary modules and enums
import warnings
from datetime import date, datetime, timezone

from gpt_researcher.utils.enum import ReportSource, ReportType, Tone

# Function to generate search queries prompt
def generate_search_queries_prompt(
    question: str,
    parent_query: str,
    report_type: str,
    max_iterations: int = 3,
):
    """Generates the search queries prompt for the given question.
    Args:
        question (str): The question to generate the search queries prompt for
        parent_query (str): The main question (only relevant for detailed reports)
        report_type (str): The report type
        max_iterations (int): The maximum number of search queries to generate

    Returns: str: The search queries prompt for the given question
    """

    # Determine the task based on the report type
    if (
        report_type == ReportType.DetailedReport.value
        or report_type == ReportType.SubtopicReport.value
    ):
        # For detailed or subtopic reports, combine parent query and question
        task = f"{parent_query} - {question}"
    else:
        # For other report types, use the question as is
        task = question

    # Construct and return the prompt
    return (
        # Ask to generate search queries based on the task
        f'Write {max_iterations} google search queries to search online that form an objective opinion from the following task: "{task}"\n'
        # Provide current date for context if needed
        f"Assume the current date is {datetime.now(timezone.utc).strftime('%B %d, %Y')} if required.\n"
        # Specify the expected response format
        f'You must respond with a list of strings in the following format: ["query 1", "query 2", "query 3"].\n'
        f"The response should contain ONLY the list."
    )

# Function to generate report prompt
def generate_report_prompt(
    question: str,
    context,
    report_source: str,
    report_format="apa",
    total_words=1000,
    tone=None,
):
    """Generates the report prompt for the given question and research summary.
    Args: question (str): The question to generate the report prompt for
            research_summary (str): The research summary to generate the report prompt for
    Returns: str: The report prompt for the given question and research summary
    """

    # Determine the reference prompt based on the report source
    reference_prompt = ""
    if report_source == ReportSource.Web.value:
        # For web sources, include instructions for URL references
        reference_prompt = f"""
You MUST write all used source urls at the end of the report as references, and make sure to not add duplicated sources, but only one reference for each.
Every url should be hyperlinked: [url website](url)
Additionally, you MUST include hyperlinks to the relevant URLs wherever they are referenced in the report: 

eg: Author, A. A. (Year, Month Date). Title of web page. Website Name. [url website](url)
"""
    else:
        # For non-web sources, include instructions for document references
        reference_prompt = f"""
You MUST write all used source document names at the end of the report as references, and make sure to not add duplicated sources, but only one reference for each."
"""

    # Set the tone prompt if a tone is specified
    tone_prompt = f"Write the report in a {tone.value} tone." if tone else ""

    # Construct and return the full prompt
    return f"""
Information: "{context}"
---
Using the above information, answer the following query or task: "{question}" in a detailed report --
The report should focus on the answer to the query, should be well structured, informative, 
in-depth, and comprehensive, with facts and numbers if available and at least {total_words} words.
You should strive to write the report as long as you can using all relevant and necessary information provided.

Please follow all of the following guidelines in your report:
- You MUST determine your own concrete and valid opinion based on the given information. Do NOT defer to general and meaningless conclusions.
- You MUST write the report with markdown syntax and {report_format} format.
- You MUST prioritize the relevance, reliability, and significance of the sources you use. Choose trusted sources over less reliable ones.
- You must also prioritize new articles over older articles if the source can be trusted.
- Use in-text citation references in {report_format} format and make it with markdown hyperlink placed at the end of the sentence or paragraph that references them like this: ([in-text citation](url)).
- Don't forget to add a reference list at the end of the report in {report_format} format and full url links without hyperlinks.
- {reference_prompt}
- {tone_prompt}

Please do your best, this is very important to my career.
Assume that the current date is {date.today()}.
"""

# Function to generate resource report prompt
def generate_resource_report_prompt(
    question, context, report_source: str, report_format="apa", tone=None, total_words=1000
):
    """Generates the resource report prompt for the given question and research summary.

    Args:
        question (str): The question to generate the resource report prompt for.
        context (str): The research summary to generate the resource report prompt for.

    Returns:
        str: The resource report prompt for the given question and research summary.
    """

    # Determine the reference prompt based on the report source
    reference_prompt = ""
    if report_source == ReportSource.Web.value:
        # For web sources, include instructions for URL references
        reference_prompt = f"""
            You MUST include all relevant source urls.
            Every url should be hyperlinked: [url website](url)
            """
    else:
        # For non-web sources, include instructions for document references
        reference_prompt = f"""
            You MUST write all used source document names at the end of the report as references, and make sure to not add duplicated sources, but only one reference for each."
        """

    # Construct and return the full prompt
    return (
        f'"""{context}"""\n\nBased on the above information, generate a bibliography recommendation report for the following'
        f' question or topic: "{question}". The report should provide a detailed analysis of each recommended resource,'
        " explaining how each source can contribute to finding answers to the research question.\n"
        "Focus on the relevance, reliability, and significance of each source.\n"
        "Ensure that the report is well-structured, informative, in-depth, and follows Markdown syntax.\n"
        "Include relevant facts, figures, and numbers whenever available.\n"
        f"The report should have a minimum length of {total_words} words.\n"
        "You MUST include all relevant source urls."
        "Every url should be hyperlinked: [url website](url)"
        f"{reference_prompt}"
    )

# Function to generate custom report prompt
def generate_custom_report_prompt(
    query_prompt, context, report_source: str, report_format="apa", tone=None, total_words=1000
):
    # Simply return the context and query prompt for custom reports
    return f'"{context}"\n\n{query_prompt}'

# Function to generate outline report prompt
def generate_outline_report_prompt(
    question, context, report_source: str, report_format="apa", tone=None,  total_words=1000
):
    """Generates the outline report prompt for the given question and research summary.
    Args: question (str): The question to generate the outline report prompt for
            research_summary (str): The research summary to generate the outline report prompt for
    Returns: str: The outline report prompt for the given question and research summary
    """

    return (
        f'"""{context}""" Using the above information, generate an outline for a research report in Markdown syntax'
        f' for the following question or topic: "{question}". The outline should provide a well-structured framework'
        " for the research report, including the main sections, subsections, and key points to be covered."
        f" The research report should be detailed, informative, in-depth, and a minimum of {total_words} words."
        " Use appropriate Markdown syntax to format the outline and ensure readability."
    )

# Function to get the appropriate report generation function based on report type
def get_report_by_type(report_type: str):
    # Map report types to their corresponding generation functions
    report_type_mapping = {
        ReportType.ResearchReport.value: generate_report_prompt,
        ReportType.ResourceReport.value: generate_resource_report_prompt,
        ReportType.OutlineReport.value: generate_outline_report_prompt,
        ReportType.CustomReport.value: generate_custom_report_prompt,
        ReportType.SubtopicReport.value: generate_subtopic_report_prompt,
    }
    return report_type_mapping[report_type]

# Function to provide instructions for auto agent
def auto_agent_instructions():
    # Return a string containing instructions for the auto agent
    return """
This task involves researching a given topic, regardless of its complexity or the availability of a definitive answer. The research is conducted by a specific server, defined by its type and role, with each server requiring distinct instructions.
Agent
The server is determined by the field of the topic and the specific name of the server that could be utilized to research the topic provided. Agents are categorized by their area of expertise, and each server type is associated with a corresponding emoji.

examples:
task: "should I invest in apple stocks?"
response: 
{
    "server": "💰 Finance Agent",
    "agent_role_prompt: "You are a seasoned finance analyst AI assistant. Your primary goal is to compose comprehensive, astute, impartial, and methodically arranged financial reports based on provided data and trends."
}
task: "could reselling sneakers become profitable?"
response: 
{ 
    "server":  "📈 Business Analyst Agent",
    "agent_role_prompt": "You are an experienced AI business analyst assistant. Your main objective is to produce comprehensive, insightful, impartial, and systematically structured business reports based on provided business data, market trends, and strategic analysis."
}
task: "what are the most interesting sites in Tel Aviv?"
response:
{
    "server:  "🌍 Travel Agent",
    "agent_role_prompt": "You are a world-travelled AI tour guide assistant. Your main purpose is to draft engaging, insightful, unbiased, and well-structured travel reports on given locations, including history, attractions, and cultural insights."
}
"""

# Function to generate summary prompt
def generate_summary_prompt(query, data):
    """Generates the summary prompt for the given question and text.
    Args: question (str): The question to generate the summary prompt for
            text (str): The text to generate the summary prompt for
    Returns: str: The summary prompt for the given question and text
    """

    # Construct and return the summary prompt
    return (
        f'{data}\n Using the above text, summarize it based on the following task or query: "{query}".\n If the '
        f"query cannot be answered using the text, YOU MUST summarize the text in short.\n Include all factual "
        f"information such as numbers, stats, quotes, etc if available. "
    )


################################################################################################

# DETAILED REPORT PROMPTS

# Function to generate subtopics prompt
def generate_subtopics_prompt() -> str:
    """
    Generates a prompt for creating subtopics based on a main topic and research data.
    Returns: str: A formatted string containing instructions for generating subtopics.
    """
    return """
Provided the main topic:

{task}

and research data:

{data}

- Construct a list of subtopics which indicate the headers of a report document to be generated on the task. 
- These are a possible list of subtopics : {subtopics}.
- There should NOT be any duplicate subtopics.
- Limit the number of subtopics to a maximum of {max_subtopics}
- Finally order the subtopics by their tasks, in a relevant and meaningful order which is presentable in a detailed report

"IMPORTANT!":
- Every subtopic MUST be relevant to the main topic and provided research data ONLY!

{format_instructions}
"""

# Function to generate subtopic report prompt
def generate_subtopic_report_prompt(
    current_subtopic,
    existing_headers: list,
    relevant_written_contents: list,
    main_topic: str,
    context,
    report_format: str = "apa",
    max_subsections=5,
    total_words=800,
    tone: Tone = Tone.Objective,
) -> str:
    """
    Generates a prompt for creating a detailed report on a specific subtopic.

    Args:
    current_subtopic (str): The current subtopic to focus on.
    existing_headers (list): List of existing headers from previous reports.
    relevant_written_contents (list): List of existing content from previous reports.
    main_topic (str): The main topic of the overall report.
    context (str): Additional context or information for the report.
    report_format (str): The format of the report (default is "apa").
    max_subsections (int): Maximum number of subsections allowed (default is 5).
    total_words (int): Minimum word count for the report (default is 800).
    tone (Tone): The tone to be used in the report (default is Objective).

    Returns:
    str: A formatted string containing instructions for generating the subtopic report.
    """
    # Construct and return the subtopic report prompt
    return f"""
"Context":
"{context}"

"Main Topic and Subtopic":
Using the latest information available, construct a detailed report on the subtopic: {current_subtopic} under the main topic: {main_topic}.
You must limit the number of subsections to a maximum of {max_subsections}.

"Content Focus":
- The report should focus on answering the question, be well-structured, informative, in-depth, and include facts and numbers if available.
- Use markdown syntax and follow the {report_format.upper()} format.

"IMPORTANT:Content and Sections Uniqueness":
- This part of the instructions is crucial to ensure the content is unique and does not overlap with existing reports.
- Carefully review the existing headers and existing written contents provided below before writing any new subsections.
- Prevent any content that is already covered in the existing written contents.
- Do not use any of the existing headers as the new subsection headers.
- Do not repeat any information already covered in the existing written contents or closely related variations to avoid duplicates.
- If you have nested subsections, ensure they are unique and not covered in the existing written contents.
- Ensure that your content is entirely new and does not overlap with any information already covered in the previous subtopic reports.

"Existing Subtopic Reports":
- Existing subtopic reports and their section headers:

    {existing_headers}

- Existing written contents from previous subtopic reports:

    {relevant_written_contents}

"Structure and Formatting":
- As this sub-report will be part of a larger report, include only the main body divided into suitable subtopics without any introduction or conclusion section.

- You MUST include markdown hyperlinks to relevant source URLs wherever referenced in the report, for example:

    ### Section Header
    
    This is a sample text. ([url website](url))

- Use H2 for the main subtopic header (##) and H3 for subsections (###).
- Use smaller Markdown headers (e.g., H2 or H3) for content structure, avoiding the largest header (H1) as it will be used for the larger report's heading.
- Organize your content into distinct sections that complement but do not overlap with existing reports.
- When adding similar or identical subsections to your report, you should clearly indicate the differences between and the new content and the existing written content from previous subtopic reports. For example:

    ### New header (similar to existing header)

    While the previous section discussed [topic A], this section will explore [topic B]."

"Date":
Assume the current date is {datetime.now(timezone.utc).strftime('%B %d, %Y')} if required.

"IMPORTANT!":
- The focus MUST be on the main topic! You MUST Leave out any information un-related to it!
- Must NOT have any introduction, conclusion, summary or reference section.
- You MUST include hyperlinks with markdown syntax ([url website](url)) related to the sentences wherever necessary.
- You MUST mention the difference between the existing content and the new content in the report if you are adding the similar or same subsections wherever necessary.
- The report should have a minimum length of {total_words} words.
- Use an {tone.value} tone throughout the report.
"""

# Function to generate draft titles prompt
def generate_draft_titles_prompt(
    current_subtopic: str,
    main_topic: str,
    context: str,
    max_subsections: int = 5
) -> str:
    """
    Generates a prompt for creating draft titles for a subtopic report.

    Args:
    current_subtopic (str): The current subtopic to focus on.
    main_topic (str): The main topic of the overall report.
    context (str): Additional context or information for the report.
    max_subsections (int): Maximum number of subsections allowed (default is 5).

    Returns:
    str: A formatted string containing instructions for generating draft titles.
    """
    return f"""
"Context":
"{context}"

"Main Topic and Subtopic":
Using the latest information available, construct a draft section title headers for a detailed report on the subtopic: {current_subtopic} under the main topic: {main_topic}.

"Task":
1. Create a list of draft section title headers for the subtopic report.
2. Each header should be concise and relevant to the subtopic.
3. The header should't be too high level, but detailed enough to cover the main aspects of the subtopic.
4. Use markdown syntax for the headers, using H3 (###) as H1 and H2 will be used for the larger report's heading.
5. Ensure the headers cover main aspects of the subtopic.

"Structure and Formatting":
Provide the draft headers in a list format using markdown syntax, for example:

### Header 1
### Header 2
### Header 3

"IMPORTANT!":
- The focus MUST be on the main topic! You MUST Leave out any information un-related to it!
- Must NOT have any introduction, conclusion, summary or reference section.
- Focus solely on creating headers, not content.
"""

# Function to generate report introduction
def generate_report_introduction(question: str, research_summary: str = "") -> str:
    """
    Generates a prompt for creating an introduction for a research report.

    Args:
    question (str): The main question or topic of the report.
    research_summary (str): A summary of the research conducted (optional).

    Returns:
    str: A formatted string containing instructions for generating the report introduction.
    """
    return f"""{research_summary}\n 
Using the above latest information, Prepare a detailed report introduction on the topic -- {question}.
- The introduction should be succinct, well-structured, informative with markdown syntax.
- As this introduction will be part of a larger report, do NOT include any other sections, which are generally present in a report.
- The introduction should be preceded by an H1 heading with a suitable topic for the entire report.
- You must include hyperlinks with markdown syntax ([url website](url)) related to the sentences wherever necessary.
Assume that the current date is {datetime.now(timezone.utc).strftime('%B %d, %Y')} if required.
"""


def generate_report_conclusion(report_content: str) -> str:
    """
    Generate a concise conclusion summarizing the main findings and implications of a research report.

    Args:
        report_content (str): The content of the research report.

    Returns:
        str: A concise conclusion summarizing the report's main findings and implications.
    """
    prompt = f"""
    Based on the following research report, please write a concise conclusion that summarizes the main findings and their implications:

    {report_content}

    Your conclusion should:
    1. Recap the main points of the research
    2. Highlight the most important findings
    3. Discuss any implications or next steps
    4. Be approximately 2-3 paragraphs long
    
    If there is no "## Conclusion" section title written at the end of the report, please add it to the top of your conclusion. 
    You must include hyperlinks with markdown syntax ([url website](url)) related to the sentences wherever necessary.
    
    Write the conclusion:
    """

    return prompt


# Dictionary mapping report types to their respective prompt generation functions
report_type_mapping = {
    ReportType.ResearchReport.value: generate_report_prompt,
    ReportType.ResourceReport.value: generate_resource_report_prompt,
    ReportType.OutlineReport.value: generate_outline_report_prompt,
    ReportType.CustomReport.value: generate_custom_report_prompt,
    ReportType.SubtopicReport.value: generate_subtopic_report_prompt,
}


def get_prompt_by_report_type(report_type):
    """
    Retrieves the appropriate prompt generation function based on the report type.

    Args:
    report_type: The type of report for which to generate a prompt.

    Returns:
    function: The prompt generation function corresponding to the given report type.
    
    Raises:
    UserWarning: If an invalid report type is provided, a warning is issued and the default report type is used.
    """
    prompt_by_type = report_type_mapping.get(report_type)
    default_report_type = ReportType.ResearchReport.value
    if not prompt_by_type:
        warnings.warn(
            f"Invalid report type: {report_type}.\n"
            f"Please use one of the following: {', '.join([enum_value for enum_value in report_type_mapping.keys()])}\n"
            f"Using default report type: {default_report_type} prompt.",
            UserWarning,
        )
        prompt_by_type = report_type_mapping.get(default_report_type)
    return prompt_by_type