# Import necessary modules
from typing import List
from pydantic import BaseModel, Field

# Define a Pydantic model for a single subtopic
class Subtopic(BaseModel):
    # Define a 'task' field with a description and minimum length constraint
    task: str = Field(description="Task name", min_length=1)

# Define a Pydantic model for a collection of subtopics
class Subtopics(BaseModel):
    # Define a 'subtopics' field as a list of Subtopic objects
    subtopics: List[Subtopic] = []

# These Pydantic models are used for data validation and serialization.
# They ensure that the data structure for subtopics is consistent and meets specified criteria.
# The Subtopics class can be used to validate and store a list of Subtopic objects.
