# Import necessary utility functions for file operations
from .utils.file_formats import \
    write_md_to_pdf, \
    write_md_to_word, \
    write_text_to_md

# Import utility function for printing agent output
from .utils.views import print_agent_output


class PublisherAgent:
    def __init__(self, output_dir: str, websocket=None, stream_output=None, headers=None):
        # Initialize the PublisherAgent with necessary parameters
        self.websocket = websocket  # For real-time communication if needed
        self.stream_output = stream_output  # Function to stream output
        self.output_dir = output_dir  # Directory to save published files
        self.headers = headers or {}  # HTTP headers, if any
        
    async def publish_research_report(self, research_state: dict, publish_formats: dict):
        # Main method to publish the research report
        layout = self.generate_layout(research_state)  # Generate the report layout
        await self.write_report_by_formats(layout, publish_formats)  # Write the report in specified formats

        return layout

    def generate_layout(self, research_state: dict):
        # Generate the layout of the research report
        # Combine all sections of the research data
        sections = '\n\n'.join(f"{value}"
                                 for subheader in research_state.get("research_data")
                                 for key, value in subheader.items())
        # Combine all references
        references = '\n'.join(f"{reference}" for reference in research_state.get("sources"))
        headers = research_state.get("headers")
        
        # Create the full layout of the report
        layout = f"""# {headers.get('title')}
#### {headers.get("date")}: {research_state.get('date')}

## {headers.get("introduction")}
{research_state.get('introduction')}

## {headers.get("table_of_contents")}
{research_state.get('table_of_contents')}

{sections}

## {headers.get("conclusion")}
{research_state.get('conclusion')}

## {headers.get("references")}
{references}
"""
        return layout

    async def write_report_by_formats(self, layout:str, publish_formats: dict):
        # Write the report in the specified formats
        if publish_formats.get("pdf"):
            await write_md_to_pdf(layout, self.output_dir)
        if publish_formats.get("docx"):
            await write_md_to_word(layout, self.output_dir)
        if publish_formats.get("markdown"):
            await write_text_to_md(layout, self.output_dir)

    async def run(self, research_state: dict):
        # Main method to run the publishing process
        task = research_state.get("task")
        publish_formats = task.get("publish_formats")
        
        # Log the publishing process
        if self.websocket and self.stream_output:
            await self.stream_output("logs", "publishing", f"Publishing final research report based on retrieved data...", self.websocket)
        else:
            print_agent_output(output="Publishing final research report based on retrieved data...", agent="PUBLISHER")
        
        # Publish the research report
        final_research_report = await self.publish_research_report(research_state, publish_formats)
        return {"report": final_research_report}
