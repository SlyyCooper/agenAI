# Import necessary types and modules
from typing import TypedDict, List, Annotated
import operator

# Define a custom type for representing the state of a draft
class DraftState(TypedDict):
    # The original task details
    task: dict
    # The main topic of the draft
    topic: str
    # The current state of the draft, likely containing sections or content
    draft: dict
    # Any review comments or feedback on the draft
    review: str
    # Notes for revision based on the review
    revision_notes: str