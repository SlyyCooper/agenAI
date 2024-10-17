import logging
import sys
from copy import copy
from typing import Literal

import click

# Define a custom log level for more granular logging
TRACE_LOG_LEVEL = 5

def get_formatted_logger():
    """Return a formatted logger."""
    # Create a logger named "scraper"
    logger = logging.getLogger("scraper")
    # Set the logging level to INFO
    logger.setLevel(logging.INFO)

    # Check if the logger already has handlers to avoid duplicates
    if not logger.handlers:
        # Create a StreamHandler to output logs to the console
        handler = logging.StreamHandler()

        # Create a formatter using DefaultFormatter (defined below)
        formatter = DefaultFormatter(
            "%(levelprefix)s [%(asctime)s] %(message)s",
            datefmt="%H:%M:%S"
        )

        # Set the formatter for the handler
        handler.setFormatter(formatter)

        # Add the handler to the logger
        logger.addHandler(handler)

    # Disable propagation to prevent duplicate logging from parent loggers
    logger.propagate = False

    return logger


class ColourizedFormatter(logging.Formatter):
    """
    A custom log formatter class that:

    * Outputs the LOG_LEVEL with an appropriate color.
    * If a log call includes an `extras={"color_message": ...}` it will be used
      for formatting the output, instead of the plain text message.
    """

    # Define colors for different log levels
    level_name_colors = {
        TRACE_LOG_LEVEL: lambda level_name: click.style(str(level_name), fg="blue"),
        logging.DEBUG: lambda level_name: click.style(str(level_name), fg="cyan"),
        logging.INFO: lambda level_name: click.style(str(level_name), fg="green"),
        logging.WARNING: lambda level_name: click.style(str(level_name), fg="yellow"),
        logging.ERROR: lambda level_name: click.style(str(level_name), fg="red"),
        logging.CRITICAL: lambda level_name: click.style(str(level_name), fg="bright_red"),
    }

    def __init__(
        self,
        fmt: str | None = None,
        datefmt: str | None = None,
        style: Literal["%", "{", "$"] = "%",
        use_colors: bool | None = None,
    ):
        # Determine whether to use colors based on the use_colors parameter or if stdout is a TTY
        if use_colors in (True, False):
            self.use_colors = use_colors
        else:
            self.use_colors = sys.stdout.isatty()
        super().__init__(fmt=fmt, datefmt=datefmt, style=style)

    def color_level_name(self, level_name: str, level_no: int) -> str:
        """Apply color to the log level name based on its severity."""
        def default(level_name: str) -> str:
            return str(level_name)  # pragma: no cover

        func = self.level_name_colors.get(level_no, default)
        return func(level_name)

    def should_use_colors(self) -> bool:
        """Determine if colors should be used in the output."""
        return True  # pragma: no cover

    def formatMessage(self, record: logging.LogRecord) -> str:
        """Format the log message with colors and custom formatting."""
        recordcopy = copy(record)
        levelname = recordcopy.levelname
        seperator = " " * (8 - len(recordcopy.levelname))
        if self.use_colors:
            levelname = self.color_level_name(levelname, recordcopy.levelno)
            if "color_message" in recordcopy.__dict__:
                recordcopy.msg = recordcopy.__dict__["color_message"]
                recordcopy.__dict__["message"] = recordcopy.getMessage()
        recordcopy.__dict__["levelprefix"] = levelname + ":" + seperator
        return super().formatMessage(recordcopy)


class DefaultFormatter(ColourizedFormatter):
    def should_use_colors(self) -> bool:
        """Determine if colors should be used based on whether stderr is a TTY."""
        return sys.stderr.isatty()  # pragma: no cover
