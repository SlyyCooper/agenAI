import json


class HumanAgent:
    def __init__(self, websocket=None, stream_output=None, headers=None):
        # Initialize the HumanAgent with optional websocket, stream_output function, and headers
        self.websocket = websocket
        self.stream_output = stream_output
        self.headers = headers or {}

    async def review_plan(self, research_state: dict):
        # Print debugging information about the websocket and stream_output
        print(f"HumanAgent websocket: {self.websocket}")
        print(f"HumanAgent stream_output: {self.stream_output}")
        
        # Extract task and layout information from the research state
        task = research_state.get("task")
        layout = research_state.get("sections")

        user_feedback = None

        # Check if human feedback is required for this task
        if task.get("include_human_feedback"):
            # If websocket and stream_output are available (e.g., from a web app)
            if self.websocket and self.stream_output:
                try:
                    # Send a request for feedback through the websocket
                    await self.stream_output(
                        "human_feedback",
                        "request",
                        f"Any feedback on this plan of topics to research? {layout}? If not, please reply with 'no'.",
                        self.websocket,
                    )
                    # Wait for and receive the response from the websocket
                    response = await self.websocket.receive_text()
                    print(f"Received response: {response}", flush=True)
                    
                    # Parse the JSON response
                    response_data = json.loads(response)
                    if response_data.get("type") == "human_feedback":
                        user_feedback = response_data.get("content")
                    else:
                        print(
                            f"Unexpected response type: {response_data.get('type')}",
                            flush=True,
                        )
                except Exception as e:
                    # Log any errors that occur during the websocket communication
                    print(f"Error receiving human feedback: {e}", flush=True)
            # If no websocket is available, prompt for feedback via console input
            else:
                user_feedback = input(
                    f"Any feedback on this plan? {layout}? If not, please reply with 'no'.\n>> "
                )

        # If the user replied with 'no', set the feedback to None
        if user_feedback and "no" in user_feedback.strip().lower():
            user_feedback = None

        # Print the final user feedback for debugging
        print(f"User feedback before return: {user_feedback}")

        # Return the user feedback as a dictionary
        return {"human_feedback": user_feedback}
