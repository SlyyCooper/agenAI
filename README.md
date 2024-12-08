<div align="center">
  <img src="frontend/public/TAN.png" alt="agenAI Logo" width="200"/>
  <h1>agenAI</h1>
  <p><strong>Pioneering AI Research with Collaborative Multi-Agent Systems</strong></p>
  
  <p>
    <a href="#-overview">Overview</a> •
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>

## 🚀 Overview

Welcome to **agenAI**—a groundbreaking multi-agent AI research platform that redefines collaborative intelligence. By orchestrating a network of specialized AI agents, agenAI enables comprehensive research and report generation, pushing the boundaries of what's possible in artificial intelligence.

## ✨ Features

- 🤖 **Collaborative Multi-Agent System**  
  Leverage a team of specialized agents—including Editor, Researcher, Reviewer, and more—that work in harmony to produce high-quality research reports.

- 📚 **Modular Report Generation**  
  Choose between Basic and Detailed reports tailored to your needs, with features like hierarchical structures, table of contents, and reference management.

- 🌐 **Advanced Research Orchestration**  
  Experience multi-phase research processes with initial research, subtopic generation, and in-depth analysis managed seamlessly by the agents.

- 💬 **Real-time Communication**  
  Stay informed with real-time WebSocket updates, including progress tracking, error reporting, and the ability to provide human feedback on-the-fly.

- 🧠 **Contextual Understanding**  
  Benefit from advanced context management, ensuring consistency, relevance, and coherence throughout the research and report generation phases.

- ⚡ **High Performance and Scalability**  
  Utilize asynchronous operations and parallel task execution for efficient performance, capable of handling complex, multi-faceted research topics.

- 🎯 **Adaptive Intelligence and Learning**  
  The system adapts to your research requirements, optimizing workflows, and continuously improving through adaptive planning and learning mechanisms.

## 🏃 Quick Start

Ready to embark on your AI research journey? Get started with agenAI in just a few steps!

### Prerequisites

Ensure you have the following installed:

- 🟩 **Node.js** (v18.17.0 recommended)
- 🐍 **Python 3.11+**
- 📦 **npm** and **pip** package managers

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/agenAI.git
   cd agenAI
   ```

2. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Install Node.js dependencies:**

   ```bash
   cd frontend/nextjs
   npm install
   ```

### Starting the Application

#### Option 1: Launch with Static Frontend (FastAPI)

1. **Start the backend server:**

   ```bash
   python -m uvicorn main:app --reload
   ```

2. **Access the platform:**

   Open your browser and navigate to [http://localhost:8000](http://localhost:8000) to experience agenAI in action!

#### Option 2: Launch with Next.js Frontend

1. **Start the Next.js development server:**

   ```bash
   cd frontend/nextjs
   npm run dev
   ```

2. **Start the backend server:**

   ```bash
   python -m uvicorn main:app --reload
   ```

3. **Access the platform:**

   Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to enjoy the full agenAI experience!

## 🛠️ Architecture

agenAI is built with a modular and scalable architecture, leveraging a multi-agent system where specialized agents collaborate to conduct research and generate comprehensive reports.

### Core Components

- **Base Agent System** (`multi_agents/agent.py`): Initializes the research team, configures agent parameters, and manages workflow compilation.

- **Specialized Agents:**
  - **Editor Agent** (`multi_agents/agents/editor.py`): Plans research outlines, organizes sections, and coordinates parallel research tasks.
  - **Research Agent** (`multi_agents/agents/researcher.py`): Gathers and analyzes information, executes initial and in-depth research, and generates reports.
  - **Reviewer and Reviser Agents** (`multi_agents/agents/reviewer.py`, `multi_agents/agents/reviser.py`): Perform content review, quality assurance, and manage revisions to ensure high-quality outputs.

### Research Process

- **Basic Report Flow:**
  - Initializes research parameters.
  - Conducts research using GPT-based agents.
  - Generates a single comprehensive report with real-time updates.

- **Detailed Report Flow:**
  - Performs initial research to build global context.
  - Generates and validates relevant subtopics.
  - Produces hierarchical reports with table of contents and references.

### Key Features

- **Context Management:** Advanced tracking of global context, URL deduplication, and content relevance checking to maintain coherence.

- **Real-time Communication:** Integration with WebSockets for progress updates, error handling, and client feedback support.

- **Performance Optimization:** Utilizes asynchronous operations and parallel task execution for efficient handling of complex research tasks.

## 🤝 Contributing

We welcome contributions to agenAI! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information on how to get involved.
