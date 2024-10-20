* **Name of the Project or Codebase**: `gpt-researcher_costom`
* **Primary Programming Language(s) Used**: Python (98.1%), TypeScript (1.2%), JavaScript (0.3%), CSS (0.2%), HTML (0.1%), PowerShell (0.1%)
* **Main Purpose or Functionality**: The project is an LLM-based autonomous agent that performs comprehensive online research on any given topic.
* Backend: FastAPI
* Firebase Admin, Firestore, Stripe SDK in Backend
* Frontend: Next.js 14 with Typescript
* Firebase auth in Frontend that connects to Backend
* one time payment product id prod_R0bEOf1dWZCjyY
* subscription product id prod_Qvu89XrhkHjzZU

#Project Strucutre

```
├── backend
    ├── memory
    │   ├── draft.py
    │   └── research.py
    ├── report_type
    │   ├── basic_report
    │   │   └── basic_report.py
    │   └── detailed_report
    │   │   └── detailed_report.py
    ├── server
    │   ├── server.py  # Main FastAPI server file, handles API routes, WebSocket connections, and integrates with Stripe for payments and subscriptions
    │   ├── server_utils.py  # Utility functions for server operations, including file handling, Firebase authentication, Stripe integration, and Firestore database operations
    │   └── websocket_manager.py  # Manages WebSocket connections, handles authentication, and facilitates real-time communication between the server and clients
    └── utils.py
├── frontend
    ├── nextjs
    │   ├── actions
    │   │   └── apiActions.ts  # Contains API action functions for handling sources, answers, user subscriptions, payments, and Stripe interactions
    │   ├── app
    │   │   ├── cancel
    │   │   │   └── page.tsx  # Handles payment cancellation, displays message and options
    │   │   ├── dashboard
    │   │   │   └── page.tsx  # User dashboard with account info, subscription details, and recent reports
    │   │   ├── globals.css   # Global styles for the application
    │   │   ├── layout.tsx    # Main layout component for the app
    │   │   ├── login
    │   │   │   └── page.tsx  # Handles user authentication with email/password, Google, and Twitter
    │   │   ├── page.tsx      # Home page component
    │   │   ├── plans
    │   │   │   └── page.tsx  # Displays subscription plans and handles Stripe payments
    │   │   ├── research
    │   │   │   └── page.tsx  # Main research interface for conducting AI-powered research
    │   │   ├── signup
    │   │   │   └── page.tsx  # User registration page with email/password, Google, and Twitter options
    │   │   ├── success
    │   │   │   └── page.tsx  # Confirmation page for successful payments or actions
    │   │   └── userprofile
    │   │   │   ├── UserProfile.module.css  # Styles specific to the user profile page
    │   │   │   └── page.tsx  # User profile management page with settings and account information
    │   ├── components
    │   │   ├── Answer.tsx
    │   │   ├── GoogleSignInButton.tsx
    │   │   ├── Header.tsx
    │   │   ├── Hero.tsx
    │   │   ├── HumanFeedback.tsx
    │   │   ├── InputArea.tsx
    │   │   ├── Langgraph
    │   │   │   └── Langgraph.js
    │   │   ├── LeftPanel.tsx
    │   │   ├── Question.tsx
    │   │   ├── ResearchContainer.tsx
    │   │   ├── RightPanel.tsx
    │   │   ├── Search.tsx
    │   │   ├── Settings.tsx
    │   │   ├── Settings
    │   │   │   ├── App.css
    │   │   │   ├── ChatBox.js
    │   │   │   ├── FileUpload.js
    │   │   │   ├── Modal.js
    │   │   │   └── ToneSelector.js
    │   │   ├── SimilarTopics.tsx
    │   │   ├── SourceCard.tsx
    │   │   ├── Sources.tsx
    │   │   ├── SubQuestions.tsx
    │   │   ├── Task
    │   │   │   ├── AccessReport.js
    │   │   │   ├── Accordion.tsx
    │   │   │   ├── AgentLogs.js
    │   │   │   ├── LogMessage.tsx
    │   │   │   ├── Report.js
    │   │   │   └── ResearchForm.js
    │   │   ├── TypeAnimation.tsx
    │   │   ├── XSigninButton.tsx
    │   │   ├── button.tsx
    │   │   ├── profile
    │   │   │   ├── BillingSection.tsx  # Handles user subscription details, payment history, and subscription cancellation
    │   │   │   ├── DeleteAccount.tsx   # Provides functionality for users to delete their account with appropriate warnings
    │   │   │   ├── ProfileHeader.tsx   # Displays user's profile information including name, email, and avatar
    │   │   │   ├── ProfileSettings.tsx  # Manages user profile settings, allowing users to update their name and email
    │   │   │   ├── ResearchPapers.tsx  # Displays a list of user's research papers, including titles and dates
    │   │   │   └── UserProfileButton.tsx  # Handles user profile button UI, login/logout functionality, and profile menu
    │   │   └── tabs.tsx
    │   ├── config.ts  # Contains client-side configuration, including Firebase settings
    │   ├── config
    │   │   ├── firebase
    │   │   │   ├── AuthContext.tsx  # Manages authentication state and user context across the app
    │   │   │   └── firebase.ts  # Initializes and exports Firebase app and authentication instances
    │   │   ├── stripe
    │   │   │   └── get-stripejs.ts  # Initializes and exports Stripe instance for payment processing
    │   │   └── task.js
    │   ├── helpers
    │   │   ├── findDifferences.js
    │   │   └── getHost.js
    │   ├── next.config.mjs
    │   ├── nginx
    │   │   └── default.conf
    │   ├── package.json
    │   ├── postcss.config.mjs
    │   ├── tailwind.config.ts
    │   └── tsconfig.json
    ├── pdf_styles.css
    ├── scripts.js
├── gpt_researcher
    ├── config
    │   └── config.py
    ├── context
    │   ├── compression.py
    │   └── retriever.py
    ├── document
    │   ├── document.py
    │   └── langchain_document.py
    ├── llm_provider
    │   └── generic
    │   │   └── base.py
    ├── memory
    │   └── embeddings.py
    ├── orchestrator
    │   ├── actions
    │   │   ├── markdown_processing.py
    │   │   ├── query_processing.py
    │   │   ├── report_generation.py
    │   │   ├── retriever.py
    │   │   ├── utils.py
    │   │   └── web_scraping.py
    │   ├── agent
    │   │   ├── context_manager.py
    │   │   ├── report_generator.py
    │   │   ├── report_scraper.py
    │   │   ├── research_agent.py
    │   │   └── research_conductor.py
    │   └── prompts.py
    ├── retrievers
    │   ├── arxiv
    │   │   └── arxiv.py
    │   ├── bing
    │   │   └── bing.py
    │   ├── custom
    │   │   └── custom.py
    │   ├── duckduckgo
    │   │   └── duckduckgo.py
    │   ├── exa
    │   │   └── exa.py
    │   ├── google
    │   │   └── google.py
    │   ├── pubmed_central
    │   │   └── pubmed_central.py
    │   ├── searchapi
    │   │   └── searchapi.py
    │   ├── searx
    │   │   └── searx.py
    │   ├── semantic_scholar
    │   │   └── semantic_scholar.py
    │   ├── serpapi
    │   │   └── serpapi.py
    │   ├── serper
    │   │   └── serper.py
    │   ├── tavily
    │   │   └── tavily_search.py
    │   └── utils.py
    ├── scraper
    │   ├── arxiv
    │   │   └── arxiv.py
    │   ├── beautiful_soup
    │   │   └── beautiful_soup.py
    │   ├── browser
    │   │   ├── browser.py
    │   │   ├── js
    │   │   │   └── overlay.js
    │   │   └── processing
    │   │   │   ├── html.py
    │   │   │   └── scrape_skills.py
    │   ├── pymupdf
    │   │   └── pymupdf.py
    │   ├── scraper.py
    │   └── web_base_loader
    │   │   └── web_base_loader.py
    └── utils
    │   ├── costs.py
    │   ├── enum.py
    │   ├── llm.py
    │   ├── logger.py
    │   └── validators.py
├── langgraph.json
├── main.py
├── multi_agents
    ├── agent.py
    ├── agents
    │   ├── editor.py
    │   ├── human.py
    │   ├── orchestrator.py
    │   ├── publisher.py
    │   ├── researcher.py
    │   ├── reviewer.py
    │   ├── reviser.py
    │   ├── utils
    │   │   ├── file_formats.py
    │   │   ├── llms.py
    │   │   ├── pdf_styles.css
    │   │   ├── utils.py
    │   │   └── views.py
    │   └── writer.py
    ├── frontend
    │   └── next-env.d.ts
    ├── langgraph.json
    ├── main.py
    ├── memory
    │   ├── draft.py
    │   └── research.py
    ├── package.json
    ├── requirements.txt
    └── task.json
├── poetry.toml
├── pyproject.toml
├── report_type
    ├── basic_report
    │   └── basic_report.py
    └── detailed_report
    │   └── detailed_report.py
├── requirements.txt
├── setup.py
└── utils.py
```