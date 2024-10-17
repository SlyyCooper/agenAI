# Import necessary modules
from .utils.views import print_agent_output
from .utils.llms import call_model
import json

# Sample JSON structure for the expected output from the reviser
sample_revision_notes = """
{
  "draft": { 
    draft title: The revised draft that you are submitting for review 
  },
  "revision_notes": Your message to the reviewer about the changes you made to the draft based on their feedback
}
"""


class ReviserAgent:
    def __init__(self, websocket=None, stream_output=None, headers=None):
        # Initialize the ReviserAgent with optional websocket, stream_output function, and headers
        self.websocket = websocket
        self.stream_output = stream_output
        self.headers = headers or {}

    async def revise_draft(self, draft_state: dict):
        """
        Revise a draft article based on reviewer feedback
        :param draft_state: A dictionary containing the current state of the draft
        :return: A JSON response containing the revised draft and revision notes
        """
        # Extract relevant information from the draft_state
        review = draft_state.get("review")
        task = draft_state.get("task")
        draft_report = draft_state.get("draft")

        # Construct the prompt for the language model
        prompt = [
            {
                "role": "system",
                "content": "You are an expert writer. Your goal is to revise drafts based on reviewer notes.",
            },
            {
                "role": "user",
                "content": f"""Draft:\n{draft_report}" + "Reviewer's notes:\n{review}\n\n
You have been tasked by your reviewer with revising the following draft, which was written by a non-expert.
If you decide to follow the reviewer's notes, please write a new draft and make sure to address all of the points they raised.
Please keep all other aspects of the draft the same.
You MUST return nothing but a JSON in the following format:
{sample_revision_notes}
""",
            },
        ]

        # Call the language model to generate the revised draft
        response = await call_model(
            prompt,
            model=task.get("model"),
            response_format="json",
        )
        return response

    async def run(self, draft_state: dict):
        # Print a message indicating that the draft is being rewritten
        print_agent_output(f"Rewriting draft based on feedback...", agent="REVISOR")

        # Call the revise_draft method to get the revised draft
        revision = await self.revise_draft(draft_state)

        # If verbose mode is enabled, output the revision notes
        if draft_state.get("task").get("verbose"):
            if self.websocket and self.stream_output:
                # If websocket is available, stream the output
                await self.stream_output(
                    "logs",
                    "revision_notes",
                    f"Revision notes: {revision.get('revision_notes')}",
                    self.websocket,
                )
            else:
                # Otherwise, print the output to the console
                print_agent_output(
                    f"Revision notes: {revision.get('revision_notes')}", agent="REVISOR"
                )

        # Return a dictionary containing the revised draft and revision notes
        return {
            "draft": revision.get("draft"),
            "revision_notes": revision.get("revision_notes"),
        }
