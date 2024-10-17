# Import necessary modules and functions
from typing import Dict, Optional

from gpt_researcher.orchestrator.prompts import (
    get_report_by_type,
    generate_report_conclusion,
    generate_report_introduction,
    generate_subtopics_prompt,
    generate_draft_titles_prompt,
)

from gpt_researcher.utils.llm import construct_subtopics, create_chat_completion
from gpt_researcher.orchestrator.actions import stream_output, generate_report, generate_draft_section_titles


class ReportGenerator:
    """Generates reports based on research data."""

    def __init__(self, researcher):
        # Initialize the ReportGenerator with a researcher object
        self.researcher = researcher

    async def write_report(self, existing_headers: list = [], relevant_written_contents: list = [], ext_context=None) -> str:
        """
        Write a report based on existing headers and relevant contents.

        Args:
            existing_headers (list): List of existing headers.
            relevant_written_contents (list): List of relevant written contents.
            ext_context (Optional): External context, if any.

        Returns:
            str: The generated report.
        """
        # Use external context if provided, otherwise use the researcher's context
        context = ext_context or self.researcher.context
        
        # Log the start of report writing if in verbose mode
        if self.researcher.verbose:
            await stream_output(
                "logs",
                "writing_report",
                f"✍️ Writing report for '{self.researcher.query}'...",
                self.researcher.websocket,
            )

        # Prepare parameters for report generation
        report_params = {
            "query": self.researcher.query,
            "context": context,
            "agent_role_prompt": self.researcher.cfg.agent_role or self.researcher.role,
            "report_type": self.researcher.report_type,
            "report_source": self.researcher.report_source,
            "tone": self.researcher.tone,
            "websocket": self.researcher.websocket,
            "cfg": self.researcher.cfg,
            "headers": self.researcher.headers,
        }

        # Add additional parameters for subtopic reports
        if self.researcher.report_type == "subtopic_report":
            report_params.update({
                "main_topic": self.researcher.parent_query,
                "existing_headers": existing_headers,
                "relevant_written_contents": relevant_written_contents,
                "cost_callback": self.researcher.add_costs,
            })
        else:
            report_params["cost_callback"] = self.researcher.add_costs

        # Generate the report using the prepared parameters
        report = await generate_report(**report_params)

        # Log the completion of report writing if in verbose mode
        if self.researcher.verbose:
            await stream_output(
                "logs",
                "report_written",
                f"📝 Report written for '{self.researcher.query}'",
                self.researcher.websocket,
            )

        return report

    async def write_report_conclusion(self, report_content: str) -> str:
        """
        Write a conclusion for the report.

        Args:
            report_content (str): The content of the report.

        Returns:
            str: The generated conclusion.
        """
        # Log the start of conclusion writing if in verbose mode
        if self.researcher.verbose:
            await stream_output(
                "logs",
                "writing_conclusion",
                f"✍️ Writing conclusion for '{self.researcher.query}'...",
                self.researcher.websocket,
            )

        # Generate the prompt for the conclusion
        conclusion_prompt = generate_report_conclusion(report_content)

        # Use the LLM to generate the conclusion
        conclusion = await create_chat_completion(
            model=self.researcher.cfg.smart_llm_model,
            messages=[
                {"role": "system", "content": f"{self.researcher.role}"},
                {"role": "user", "content": conclusion_prompt},
            ],
            temperature=0.25,
            llm_provider=self.researcher.cfg.llm_provider,
            stream=True,
            websocket=self.researcher.websocket,
            max_tokens=self.researcher.cfg.smart_token_limit,
            llm_kwargs=self.researcher.cfg.llm_kwargs,
            cost_callback=self.researcher.add_costs,
        )

        # Log the completion of conclusion writing if in verbose mode
        if self.researcher.verbose:
            await stream_output(
                "logs",
                "conclusion_written",
                f"📝 Conclusion written for '{self.researcher.query}'",
                self.researcher.websocket,
            )

        return conclusion

    async def write_introduction(self) -> str:
        """
        Write the introduction section of the report.

        Returns:
            str: The generated introduction.
        """
        # Log the start of introduction writing if in verbose mode
        if self.researcher.verbose:
            await stream_output(
                "logs",
                "writing_introduction",
                f"✍️ Writing introduction for '{self.researcher.query}'...",
                self.researcher.websocket,
            )

        # Generate the prompt for the introduction
        introduction_prompt = generate_report_introduction(
            question=self.researcher.query,
            research_summary=self.researcher.context
        )

        # Use the LLM to generate the introduction
        introduction = await create_chat_completion(
            model=self.researcher.cfg.smart_llm_model,
            messages=[
                {"role": "system", "content": f"{self.researcher.role}"},
                {"role": "user", "content": introduction_prompt},
            ],
            temperature=0.25,
            llm_provider=self.researcher.cfg.llm_provider,
            stream=True,
            websocket=self.researcher.websocket,
            max_tokens=self.researcher.cfg.smart_token_limit,
            llm_kwargs=self.researcher.cfg.llm_kwargs,
            cost_callback=self.researcher.add_costs,
        )

        # Log the completion of introduction writing if in verbose mode
        if self.researcher.verbose:
            await stream_output(
                "logs",
                "introduction_written",
                f"📝 Introduction written for '{self.researcher.query}'",
                self.researcher.websocket,
            )

        return introduction

    async def get_subtopics(self):
        """
        Retrieve subtopics for the research.

        Returns:
            list: A list of generated subtopics.
        """
        # Log the start of subtopic generation if in verbose mode
        if self.researcher.verbose:
            await stream_output(
                "logs",
                "generating_subtopics",
                f"🌳 Generating subtopics for '{self.researcher.query}'...",
                self.researcher.websocket,
            )

        # Generate subtopics using the construct_subtopics function
        subtopics = await construct_subtopics(
            task=self.researcher.query,
            data=self.researcher.context,
            config=self.researcher.cfg,
            subtopics=self.researcher.subtopics,
        )

        # Log the completion of subtopic generation if in verbose mode
        if self.researcher.verbose:
            await stream_output(
                "logs",
                "subtopics_generated",
                f"📊 Subtopics generated for '{self.researcher.query}'",
                self.researcher.websocket,
            )

        return subtopics

    async def get_draft_section_titles(self, current_subtopic: str):
        """
        Generate draft section titles for the report.

        Args:
            current_subtopic (str): The current subtopic being processed.

        Returns:
            list: A list of generated draft section titles.
        """
        # Log the start of draft section title generation if in verbose mode
        if self.researcher.verbose:
            await stream_output(
                "logs",
                "generating_draft_sections",
                f"📑 Generating draft section titles for '{self.researcher.query}'...",
                self.researcher.websocket,
            )

        # Generate draft section titles using the generate_draft_section_titles function
        draft_section_titles = await generate_draft_section_titles(
            query=self.researcher.query,
            current_subtopic=current_subtopic,
            context=self.researcher.context,
            role=self.researcher.cfg.agent_role or self.researcher.role,
            websocket=self.researcher.websocket,
            config=self.researcher.cfg,
            cost_callback=self.researcher.add_costs,
        )

        # Log the completion of draft section title generation if in verbose mode
        if self.researcher.verbose:
            await stream_output(
                "logs",
                "draft_sections_generated",
                f"🗂️ Draft section titles generated for '{self.researcher.query}'",
                self.researcher.websocket,
            )

        return draft_section_titles