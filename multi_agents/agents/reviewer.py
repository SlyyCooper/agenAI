# Import necessary utilities
from .utils.views import print_agent_output
from .utils.llms import call_model

# Define the system prompt for the reviewer agent
TEMPLATE = """You are an expert research article reviewer. \
Your goal is to review research drafts and provide feedback to the reviser only based on specific guidelines. \
"""


class ReviewerAgent:
    def __init__(self, websocket=None, stream_output=None, headers=None):
        # Initialize the agent with optional websocket for real-time communication
        self.websocket = websocket
        self.stream_output = stream_output
        self.headers = headers or {}

    async def review_draft(self, draft_state: dict):
        """
        Review a draft article based on given guidelines
        :param draft_state: A dictionary containing the draft and related information
        :return: Review feedback or None if no revisions are needed
        """
        # Extract relevant information from the draft state
        task = draft_state.get("task")
        guidelines = "- ".join(guideline for guideline in task.get("guidelines"))
        revision_notes = draft_state.get("revision_notes")

        # Prepare the prompt for reviewing a revised draft
        revise_prompt = f"""The reviser has already revised the draft based on your previous review notes with the following feedback:
{revision_notes}\n
Please provide additional feedback ONLY if critical since the reviser has already made changes based on your previous feedback.
If you think the article is sufficient or that non critical revisions are required, please aim to return None.
"""

        # Construct the main review prompt
        review_prompt = f"""You have been tasked with reviewing the draft which was written by a non-expert based on specific guidelines.
Please accept the draft if it is good enough to publish, or send it for revision, along with your notes to guide the revision.
If not all of the guideline criteria are met, you should send appropriate revision notes.
If the draft meets all the guidelines, please return None.
{revise_prompt if revision_notes else ""}

Guidelines: {guidelines}\nDraft: {draft_state.get("draft")}\n
"""
        # Prepare the prompt for the language model
        prompt = [
            {"role": "system", "content": TEMPLATE},
            {"role": "user", "content": review_prompt},
        ]

        # Call the language model to get the review
        response = await call_model(prompt, model=task.get("model"))

        # If verbose mode is on, output the review feedback
        if task.get("verbose"):
            if self.websocket and self.stream_output:
                # Stream the output if websocket is available
                await self.stream_output(
                    "logs",
                    "review_feedback",
                    f"Review feedback is: {response}...",
                    self.websocket,
                )
            else:
                # Print the output to console
                print_agent_output(
                    f"Review feedback is: {response}...", agent="REVIEWER"
                )

        # Return None if the response indicates no revisions are needed
        if "None" in response:
            return None
        return response

    async def run(self, draft_state: dict):
        """
        Main method to run the reviewer agent
        :param draft_state: A dictionary containing the draft and related information
        :return: A dictionary containing the review feedback
        """
        task = draft_state.get("task")
        guidelines = task.get("guidelines")
        to_follow_guidelines = task.get("follow_guidelines")
        review = None
        
        if to_follow_guidelines:
            print_agent_output(f"Reviewing draft...", agent="REVIEWER")

            if task.get("verbose"):
                print_agent_output(
                    f"Following guidelines {guidelines}...", agent="REVIEWER"
                )

            # Call the review_draft method to get the review
            review = await self.review_draft(draft_state)
        else:
            print_agent_output(f"Ignoring guidelines...", agent="REVIEWER")
        
        # Return the review result
        return {"review": review}
