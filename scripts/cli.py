"""
Provides a command line interface for the GPTResearcher class.

Usage:

```shell
python cli.py "<query>" --report_type <report_type>
```

"""
import asyncio
import argparse
from argparse import RawTextHelpFormatter
from uuid import uuid4

from dotenv import load_dotenv

from gpt_researcher import GPTResearcher
from gpt_researcher.utils.enum import ReportType
from backend.report_type import DetailedReport
from backend.server.firebase.storage_utils import save_research_report
from io import BytesIO

# =============================================================================
# CLI
# =============================================================================

cli = argparse.ArgumentParser(
    description="Generate a research report.",
    # Enables the use of newlines in the help message
    formatter_class=RawTextHelpFormatter)

# =====================================
# Arg: Query
# =====================================

cli.add_argument(
    # Position 0 argument
    "query",
    type=str,
    help="The query to conduct research on.")

# =====================================
# Arg: Report Type
# =====================================

choices = [report_type.value for report_type in ReportType]

report_type_descriptions = {
    ReportType.ResearchReport.value: "Summary - Short and fast (~2 min)",
    ReportType.DetailedReport.value: "Detailed - In depth and longer (~5 min)",
    ReportType.ResourceReport.value: "",
    ReportType.OutlineReport.value: "",
    ReportType.CustomReport.value: "",
    ReportType.SubtopicReport.value: ""
}

cli.add_argument(
    "--report_type",
    type=str,
    help="The type of report to generate. Options:\n" + "\n".join(
        f"  {choice}: {report_type_descriptions[choice]}" for choice in choices
    ),
    # Deserialize ReportType as a List of strings:
    choices=choices,
    required=True)

# =============================================================================
# Main
# =============================================================================


async def main(args):
    """ 
    Conduct research on the given query, generate the report, and save
    it to Firebase Storage.
    """
    if args.report_type == 'detailed_report':
        detailed_report = DetailedReport(
            query=args.query,
            report_type="research_report",
            report_source="web_search",
        )

        report = await detailed_report.run()
    else:
        researcher = GPTResearcher(
            query=args.query,
            report_type=args.report_type)

        await researcher.conduct_research()
        report = await researcher.write_report()

    # Save to Firebase Storage
    file_stream = BytesIO(report.encode('utf-8'))
    metadata = {
        'title': args.query,
        'report_type': args.report_type,
        'source': 'cli'
    }
    
    result = await save_research_report(
        file_stream=file_stream,
        metadata=metadata,
        content=report
    )
    
    print(f"Report saved to Firebase Storage. URL: {result['url']}")

if __name__ == "__main__":
    load_dotenv()
    args = cli.parse_args()
    asyncio.run(main(args))
