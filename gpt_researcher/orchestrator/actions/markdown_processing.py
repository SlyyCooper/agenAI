import re
import markdown
from typing import List, Dict

def extract_headers(markdown_text: str) -> List[Dict]:
    """
    Extract headers from markdown text.

    Args:
        markdown_text (str): The markdown text to process.

    Returns:
        List[Dict]: A list of dictionaries representing the header structure.
    """
    headers = []
    # Convert markdown to HTML
    parsed_md = markdown.markdown(markdown_text)
    # Split the HTML into lines
    lines = parsed_md.split("\n")

    stack = []
    for line in lines:
        # Check if the line is a header (starts with <h and has a digit after)
        if line.startswith("<h") and len(line) > 2 and line[2].isdigit():
            # Extract the header level (e.g., 1 for <h1>, 2 for <h2>, etc.)
            level = int(line[2])
            # Extract the header text (content between > and <)
            header_text = line[line.index(">") + 1 : line.rindex("<")]

            # Remove headers from the stack that are at the same or lower level
            while stack and stack[-1]["level"] >= level:
                stack.pop()

            # Create a new header dictionary
            header = {
                "level": level,
                "text": header_text,
            }
            
            # If there's a parent header in the stack, add this as a child
            if stack:
                stack[-1].setdefault("children", []).append(header)
            else:
                # If no parent, this is a top-level header
                headers.append(header)

            # Add this header to the stack
            stack.append(header)

    return headers

def extract_sections(markdown_text: str) -> List[Dict[str, str]]:
    """
    Extract all written sections from subtopic report.

    Args:
        markdown_text (str): Subtopic report text.

    Returns:
        List[Dict[str, str]]: List of sections, each section is a dictionary containing
        'section_title' and 'written_content'.
    """
    sections = []
    # Convert markdown to HTML
    parsed_md = markdown.markdown(markdown_text)
    
    # Regular expression to match headers and their content
    pattern = r'<h\d>(.*?)</h\d>(.*?)(?=<h\d>|$)'
    # Find all matches in the HTML
    matches = re.findall(pattern, parsed_md, re.DOTALL)
    
    for title, content in matches:
        # Remove any HTML tags from the content
        clean_content = re.sub(r'<.*?>', '', content).strip()
        if clean_content:
            sections.append({
                "section_title": title.strip(),
                "written_content": clean_content
            })
    
    return sections

def table_of_contents(markdown_text: str) -> str:
    """
    Generate a table of contents for the given markdown text.

    Args:
        markdown_text (str): The markdown text to process.

    Returns:
        str: The generated table of contents.
    """
    def generate_table_of_contents(headers, indent_level=0):
        toc = ""
        for header in headers:
            # Add indentation based on header level
            toc += " " * (indent_level * 4) + "- " + header["text"] + "\n"
            # Recursively add child headers
            if "children" in header:
                toc += generate_table_of_contents(header["children"], indent_level + 1)
        return toc

    try:
        # Extract headers from the markdown text
        headers = extract_headers(markdown_text)
        # Generate the table of contents
        toc = "## Table of Contents\n\n" + generate_table_of_contents(headers)
        return toc
    except Exception as e:
        print("table_of_contents Exception : ", e)
        # If an error occurs, return the original markdown text
        return markdown_text

def add_references(report_markdown: str, visited_urls: set) -> str:
    """
    Add references to the markdown report.

    Args:
        report_markdown (str): The existing markdown report.
        visited_urls (set): A set of URLs that have been visited during research.

    Returns:
        str: The updated markdown report with added references.
    """
    try:
        # Create a new section for references
        url_markdown = "\n\n\n## References\n\n"
        # Add each URL as a markdown link
        url_markdown += "".join(f"- [{url}]({url})\n" for url in visited_urls)
        # Append the references to the existing report
        updated_markdown_report = report_markdown + url_markdown
        return updated_markdown_report
    except Exception as e:
        print(f"Encountered exception in adding source urls : {e}")
        # If an error occurs, return the original report without references
        return report_markdown