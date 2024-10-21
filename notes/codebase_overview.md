* **Name of the Project or Codebase**: `gpt-researcher_costom`
* **Primary Programming Language(s) Used**: Python (98.1%), TypeScript (1.2%), JavaScript (0.3%), CSS (0.2%), HTML (0.1%), PowerShell (0.1%)
* **Main Purpose or Functionality**: The project is an LLM-based autonomous agent that performs comprehensive online research on any given topic.

* Backend:
    * Hosted on https://dolphin-app-49eto.ondigitalocean.app/backend
    * FastAPI
    * Firebase Admin, Firestore, Stripe SDK
    * Stripe Checkout for payments and subscriptions
        * one time payment product id prod_R0bEOf1dWZCjyY
        * subscription product id prod_Qvu89XrhkHjzZU
* Frontend:
    * Hosted on **ALL** of the following domains:
        * https://gpt-researcher-costom.vercel.app
        * https://www.tanalyze.app
        * https://tanalyze.app
        * https://agenai.app
        * https://www.agenai.app
        * http://agenai.app
        * http://www.agenai.app
    * Next.js 14 with Typescript
    * Firebase auth in Frontend that connects to Backend



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

<environment_circumstances>
- Backend:
    * Hosted on https://dolphin-app-49eto.ondigitalocean.app/backend
    * FastAPI
    * Firebase Admin, Firestore, Stripe SDK
    * Stripe Chekcouts for payments and subscriptions
        * one time payment product id prod_R0bEOf1dWZCjyY
        * subscription product id prod_Qvu89XrhkHjzZU
    * Backend Environment Variables are safely in @.env 
- Frontend:
    * Hosted on **ALL** of the following domains:
        * https://gpt-researcher-costom.vercel.app
        * https://www.tanalyze.app
        * https://tanalyze.app
        * https://agenai.app
        * https://www.agenai.app
        * http://agenai.app
        * http://www.agenai.app
    * Next.js 14 with Typescript
    * Firebase auth in Frontend that connects to Backend
    * Frontend Environment Variables are safely in @.env.local 
- The backend file @server.py contains the routes that correspond to the API actions 
- The backend file @server_utils.py  contains helper functions and utilities used by the routes
- The user has appropriate user credentials, is authenticated with my Firebase Admin SDK in my FastAPi backend server @server.py and @server_utils.py , and is correctly using my frontend client-side Firebase SDK@firebase.ts for authorization context in @AuthContext.tsx
- The user is correctly stored in my firestore database in my backend Server @server.py and @server_utils.py , using my safe environment variables that are stored in Digital Ocean, but in this .env @.env  for local testing, and is thus **OK** 
- The routes for the Stripe and Firebase frontend logic that allows the frontend and backend to communicate is in@apiActions.ts  
- Use of Stripe SDK and Stripe checkout in my backend @server.py and @server_utils.py  for my **two** stripe product IDs:
- One time payment product id: prod_R0bEOf1dWZCjyY 
- Subscription product id: prod_Qvu89XrhkHjzZU
- Stripe initiation in frontend @get-stripejs.ts  and Stripe related functions in the frontend @apiActions.ts to communicate with the backend Stripe SDK and firestore routes in@server.py and @server_utils.py , that is used by the payment plan page @page.tsx  which sends the user to the applicable Stripe Checkout depnding on the product id they select (One time payment product id: prod_R0bEOf1dWZCjyY and Subscription product id: prod_Qvu89XrhkHjzZU)
- The Stripe Firestore datapoints shown in the backend @server.py and @server_utils.py , should be correctly stored when both new and existing users checkout in @page.tsx , and tracked in @page.tsx 
- The frontend Stripe success payment page is @page.tsx 
- The frontend Stripe cancel payment page is @page.tsx 
</environment_circumstances>