# Import necessary modules
from colorama import Fore, Style  # For colored console output
from enum import Enum  # For creating an enumeration

# Define an enumeration for agent colors
class AgentColor(Enum):
    # Each agent is assigned a specific color for console output
    RESEARCHER = Fore.LIGHTBLUE_EX
    EDITOR = Fore.YELLOW
    WRITER = Fore.LIGHTGREEN_EX
    PUBLISHER = Fore.MAGENTA
    REVIEWER = Fore.CYAN
    REVISOR = Fore.LIGHTWHITE_EX
    MASTER = Fore.LIGHTYELLOW_EX

# Function to print agent output with color
def print_agent_output(output: str, agent: str = "RESEARCHER"):
    """
    Prints the agent's output with a specific color based on the agent type.
    
    Args:
    output (str): The message to be printed
    agent (str): The type of agent (default is "RESEARCHER")
    
    This function uses the AgentColor enum to get the appropriate color,
    prints the agent type and message in that color, and then resets the style.
    """
    print(f"{AgentColor[agent].value}{agent}: {output}{Style.RESET_ALL}")