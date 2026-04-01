// BOZ VERIFIED FIT v11 — DATA
export const ADMIN_EMAIL="psicologorafaelbaez@gmail.com";
export const ANA_EMAIL="ana@bozusa.com";
export const RECRUITER_EMAIL="recruiter@bozusa.com";
export const APP_VERSION="13"; // v13 — Sales 3-tab, recruiter theming, review lock, talent filters

// Role system
export const VALID_ROLES=["admin","sales","recruiter","ana","finance"];
export const ROLE_LABELS={admin:"Admin",sales:"Sales",recruiter:"Recruiter",ana:"Talent Discovery",finance:"Finance"};
export const ROLE_COLORS={admin:"#0D2550",sales:"#059669",recruiter:"#f97316",ana:"#7C3AED",finance:"#0369a1"};
export const ROLE_ICONS={admin:"⚡",sales:"💼",recruiter:"🔍",ana:"🧠",finance:"💰"};

// Process phases for tracking
export const PROCESS_PHASES=[
  {id:"client_submitted",label:"Client Submitted",color:"#3b82f6",icon:"📋"},
  {id:"recruiter_review",label:"Recruiter Review",color:"#f97316",icon:"🔍"},
  {id:"ana_assessment",label:"Talent Discovery",color:"#8b5cf6",icon:"🧠"},
  {id:"admin_pipeline",label:"Admin Pipeline",color:"#10b981",icon:"🚀"},
];

// AI System Prompts
export const AI_PROMPTS={
  // Enhanced JD extraction — extracts EVERYTHING possible
  analyze_jd:`You are an expert IT recruiter. Analyze this job description with EXTREME attention to detail. Extract EVERY technology, tool, and requirement mentioned. Return ONLY valid JSON.

CRITICAL: Many JDs mention tools in passing or in bullet points. You MUST catch ALL of them. Common ones people miss:
- DevOps: Docker, Kubernetes, Terraform, Ansible, Jenkins, GitHub Actions, GitLab CI, ArgoCD, Helm, Prometheus, Grafana, Datadog, Nginx
- Databases: PostgreSQL, MySQL, MongoDB, Redis, DynamoDB, Elasticsearch, SQL Server, Oracle, Cassandra, SQLite
- Cloud: ANY mention of AWS/Azure/GCP services (EC2, S3, Lambda, etc.)
- Languages: SQL is a language. Bash/Shell scripting counts. YAML/JSON config counts as nice-to-have.

Return this EXACT structure:
{"category":"technical|tech_lead|management|data_bi|commercial|support_ops|clevel|erp|ai_newgen",
"role":"exact role title from JD",
"seniority":"Junior|Mid|Senior|Lead|Director|VP|C-Level",
"experience":"X-X years",
"languages":["ALL programming languages: Python, Java, JavaScript, TypeScript, Go, Rust, SQL, C#, etc."],
"frameworks":["ALL frameworks: React, Spring Boot, Django, Flask, FastAPI, Express, NestJS, etc."],
"clouds":["cloud providers: AWS, Azure, GCP, Huawei Cloud, Oracle Cloud, etc."],
"cloudServices":["specific services: EC2, S3, Lambda, RDS, EKS, etc."],
"databases":["ALL databases: PostgreSQL, MySQL, MongoDB, Redis, SQL Server, DynamoDB, Elasticsearch, etc."],
"devops":["ALL devops/infra: Docker, Kubernetes, Terraform, Ansible, Jenkins, GitHub Actions, Helm, Prometheus, Grafana, Nginx, etc."],
"mustHave":["critical/required/mandatory skills — things marked as required"],
"niceToHave":["preferred/bonus/desirable skills"],
"englishLevel":"A1 - Beginner|A2 - Elementary|B1 - Intermediate|B2 - Upper Intermediate|C1 - Advanced|C2 - Proficient|Native",
"methodology":["Scrum","Kanban","SAFe","Waterfall","Lean","XP","Hybrid"],
"industry":["Fintech","Healthcare","E-commerce","SaaS","Cybersecurity","EdTech","Logistics","Retail","Manufacturing","Telecom","Gaming","Media","Government","Energy"],
"location":"LATAM|USA|LATAM or USA|Remote",
"engagement":"Full-time (40h/week)|Part-time (20h/week)|By Hours",
"headcount":1,
"certifications":"any certs: AWS SA, PMP, CISSP, etc.",
"summary":"2-3 sentence summary of the role",
"responsibilities":["extract ALL responsibilities from the JD, group related ones, 3-6 items max"],
"roleObjective":"extract the role overview/summary paragraph if present",
"extractedDetails":{"timezone":"if mentioned","startDate":"if mentioned","academia":"if mentioned","salary":"if mentioned","teamSize":"if mentioned","reportsTo":"if mentioned","visa":"if mentioned","travel":"if mentioned","holidayCountry":"if mentioned"}}

RULES:
- Extract ABSOLUTELY EVERYTHING. When in doubt, include it.
- SQL, Bash, Shell are languages. Docker, K8s, Terraform are devops. PostgreSQL, MySQL are databases.
- If the JD says "relational databases" put PostgreSQL AND MySQL. If it says "containers" put Docker.
- For englishLevel: if JD is written in English and targets international candidates, assume at least B2.
- For methodology: if JD mentions "agile" put Scrum. If mentions "sprints" put Scrum.
- Guess seniority from years of experience if not explicit (1-3=Junior/Mid, 3-5=Mid/Senior, 5+=Senior/Lead)
- JSON only, no markdown, no explanation`,

  // Shorter, grouped responsibilities  
  auto_responsibilities:`You are a senior IT recruiter. Generate a concise role profile. Return ONLY JSON:
{"objective":"2-3 sentence role objective, specific to the stack and level",
"responsibilities":["3-4 responsibilities MAXIMUM. Each is a SHORT title followed by a colon and a brief 1-sentence description. Example: 'System Architecture: Design and maintain scalable microservices using Spring Boot and AWS.' Keep each under 25 words."]}
Be specific to the exact technologies and seniority. JSON only.`,

  // Context-aware platform assistant
  platform_help:`You are BOZ Verified Fit's intelligent assistant. You know the platform deeply AND can give technical staffing advice.

PLATFORM KNOWLEDGE:
- 8 steps: Client Info → Upload JD → Category & Role → Experience & Engagement → Tech Stack → Priorities (Must/Nice) → Details → Review
- Upload: accepts PDF/images, AI extracts data automatically
- Categories: Technical, Tech Lead, Management, Data & BI, Commercial, Support, C-Level, ERP, AI
- After client submits: goes to Recruiter for review → Ana for soft skills → Admin for pipeline
- The Review step auto-generates Role Objective and Responsibilities with AI

CURRENT FORM STATE (provided in each message):
You will receive the current form data. Use it to give specific advice like "You selected Java but haven't added Spring Boot — consider adding it" or "For a Senior Backend role, B2 English is usually minimum."

RULES:
- Help with platform navigation AND technical staffing recommendations
- Be conversational, brief, and specific to their current data
- If asked something unrelated to IT staffing or the platform, redirect politely
- Respond in the same language as the user`,

  // Recruiter question generation
  recruiter_questions:`Based on this technical profile, suggest 5-7 interview questions a psychologist should ask the client. Focus on: leadership style, team dynamics, problem-solving approach, cultural fit, work style. Return ONLY a JSON array of strings. No markdown.`,

  // Fast-track completion chat
  fast_track:`You help complete missing profile fields. Given current data as JSON, ask about ONE missing field at a time. When user answers, return the update as JSON on its own line, then ask the next question. Say "COMPLETE" when done. Be brief. Respond in user's language.`,

  // Phase 2: Intelligent tech gap analysis after JD extraction
  suggest_completions:`You are a senior IT staffing analyst. Given an extracted job profile, identify what CRITICAL categories are MISSING from the profile. Analyze each category independently.

RULES:
- Analyze what's MISSING, not what's already there
- Each suggestion is ONE category that's absent or weak
- Max 6 suggestions
- For TECHNICAL roles check: databases, devops/CI-CD, cloud services, frameworks/libraries, testing/QA tools, operating systems, version control
- For NON-TECHNICAL roles check: project management tools (Jira, Asana, Monday), communication platforms, analytics tools, CRM systems, documentation tools, collaboration suites
- Each suggestion: category name, specific items to add (2-3 max), and a clear explanation of WHY this category matters for this specific role
- Don't suggest what's already in the profile
- Be specific to the seniority level and industry

IMPORTANT: Frame each suggestion as "I don't see [CATEGORY] in this profile. For a [ROLE], you typically need..." 

Return ONLY valid JSON: {"suggestions":[{"category":"databases","items":["PostgreSQL","Redis"],"reason":"I don't see any databases in this profile. A Senior Backend Developer with Java typically needs a relational database for data persistence and a caching layer for performance."}]}
If profile is complete return {"suggestions":[]}`,

  // Phase 3: Admin alert detection
  admin_alerts:`You are a senior IT recruiter reviewing a candidate profile for inconsistencies and red flags. Analyze the profile data and return alerts.

Check for:
- Seniority vs experience mismatch (e.g. "Senior" with "1-2 years")
- Missing critical tech for the role type (e.g. backend without databases)
- Incomplete profiles (many empty fields)
- Unrealistic combinations (e.g. C-Level with Junior experience)
- Location/timezone conflicts with engagement type
- Must-have skills that are very generic or too few

Return ONLY valid JSON: {"alerts":[{"type":"warning|error|info","title":"Short title","detail":"1 sentence explanation"}]}
If no issues found, return {"alerts":[]}`,

  ana_chat:`You are BOZ's soft skills analyst. You ONLY help with soft skills evaluation from client meetings. Redirect any unrelated questions. Respond in user's language.`,

  ana_structure:`You are an organizational psychologist. Structure meeting notes into JSON:
{"personality":["3-4 traits"],"workStyle":["3-4 preferences"],"behavioralInsights":["3-4 observations"],"keyStrengths":["4-5 strengths"],"cultureFit":["3-4 indicators"],"softSkillsSummary":"2-3 sentence summary"}
Be specific. JSON only.`,
};

export const CATEGORIES=[
  {id:"technical",label:"Technical",desc:"Dev, QA, DevOps, Data, Security, Embedded",icon:"⚙️",color:"#3b82f6"},
  {id:"tech_lead",label:"Technical Leadership",desc:"Tech Lead, Architect, Eng Manager",icon:"🏗️",color:"#8b5cf6"},
  {id:"management",label:"Management & Product",desc:"PM, PO, Scrum Master, Agile Coach",icon:"📋",color:"#f59e0b"},
  {id:"data_bi",label:"Data & BI",desc:"Data Engineer, Analyst, BI Developer",icon:"📊",color:"#10b981"},
  {id:"commercial",label:"Commercial & Client",desc:"KAM, Sales, Pre-Sales, CSM",icon:"🤝",color:"#ef4444"},
  {id:"support_ops",label:"Support & Operations",desc:"IT Support, SysAdmin, NOC",icon:"🛠️",color:"#64748b"},
  {id:"clevel",label:"C-Level",desc:"CTO, CIO, CPO, CDO, CISO",icon:"👔",color:"#0D2550"},
  {id:"erp",label:"ERP & Business Apps",desc:"D365 BC, NAV, SAP",icon:"🏢",color:"#d946ef"},
  {id:"ai_newgen",label:"AI & New Gen",desc:"LLM, MLOps, NLP, CV, Prompt Eng",icon:"🤖",color:"#06b6d4"},
];

export const ROLES_MAP={
  technical:["Software Developer","Frontend Developer","Backend Developer","Full-Stack Developer","Mobile Developer (iOS)","Mobile Developer (Android)","React Native Developer","Flutter Developer","QA Engineer","QA Automation Engineer","SDET","DevOps Engineer","SRE","Cloud Engineer","Platform Engineer","Security Engineer","Penetration Tester","Embedded Systems Engineer","Firmware Engineer","Database Administrator","Solutions Architect","UI Developer","API Developer","Blockchain Developer","IoT Engineer","Performance Engineer","Release Engineer"],
  tech_lead:["Tech Lead","Software Architect","Solutions Architect","Engineering Manager","Principal Engineer","VP of Engineering","Staff Engineer"],
  management:["Project Manager","Product Manager","Product Owner","Scrum Master","Agile Coach","Delivery Manager","Program Manager","Release Manager","PMO Director","Technical Program Manager"],
  data_bi:["Data Engineer","Data Analyst","BI Developer","Data Scientist","Analytics Engineer","ETL Developer","Power BI Developer","Tableau Developer","Data Architect","Data Governance Analyst"],
  commercial:["Key Account Manager","Sales Executive","Pre-Sales Engineer","Customer Success Manager","Business Development Rep","Account Executive","Sales Director","Solutions Consultant"],
  support_ops:["IT Support Specialist","Help Desk Analyst","System Administrator","Network Engineer","NOC Engineer","IT Operations Manager","Infrastructure Engineer","Cloud Administrator"],
  clevel:["CTO","CIO","CPO","CDO","CISO","VP of Technology","VP of Product","VP of Data","VP of Engineering"],
  erp:["D365 BC Developer","D365 BC Functional Consultant","NAV Developer","NAV Specialist","D365 F&O Developer","D365 F&O Functional Consultant","Power Platform Developer","Dynamics CRM Developer","SAP Developer","SAP Functional Consultant","SAP Basis Administrator"],
  ai_newgen:["LLM Engineer","ML Engineer","MLOps Engineer","NLP Engineer","Computer Vision Engineer","Prompt Engineer","AI Solutions Architect","Data Scientist (AI/ML)","Conversational AI Developer","Robotics Engineer","AI Safety Engineer","Generative AI Developer"],
};

export const ROLE_TYPE={
  "Frontend Developer":"frontend","UI Developer":"frontend","Backend Developer":"backend","API Developer":"backend","Solutions Architect":"backend",
  "Full-Stack Developer":"fullstack","Software Developer":"fullstack","Mobile Developer (iOS)":"mobile_ios","Mobile Developer (Android)":"mobile_android",
  "React Native Developer":"mobile_cross","Flutter Developer":"mobile_flutter","QA Engineer":"qa","QA Automation Engineer":"qa","SDET":"qa",
  "DevOps Engineer":"devops","SRE":"devops","Cloud Engineer":"devops","Platform Engineer":"devops","Release Engineer":"devops",
  "Security Engineer":"security","Penetration Tester":"security","Embedded Systems Engineer":"embedded","Firmware Engineer":"embedded","IoT Engineer":"embedded",
  "Database Administrator":"dba","Data Engineer":"data","Data Analyst":"data","BI Developer":"data","Data Scientist":"data_science",
  "Analytics Engineer":"data","ETL Developer":"data","Power BI Developer":"data","Tableau Developer":"data","Data Architect":"data","Data Governance Analyst":"data",
  "LLM Engineer":"ai","ML Engineer":"ai","MLOps Engineer":"ai_ops","NLP Engineer":"ai","Computer Vision Engineer":"ai",
  "Prompt Engineer":"ai","AI Solutions Architect":"ai","Data Scientist (AI/ML)":"ai","Conversational AI Developer":"ai","Robotics Engineer":"ai",
  "AI Safety Engineer":"ai","Generative AI Developer":"ai","Blockchain Developer":"blockchain","Performance Engineer":"fullstack",
  "Staff Engineer":"fullstack","Technical Program Manager":"fullstack","Solutions Consultant":"fullstack",
};

export const ALL_LANGS={"Python":["3.9","3.10","3.11","3.12","3.13"],"Java":["8","11","17","21"],"JavaScript":["ES6+","ES2020+","ES2022+","ES2024+"],"TypeScript":["4.9","5.0","5.2","5.4","5.5"],"C#":["10","11","12","13"],"Go":["1.20","1.21","1.22","1.23"],"PHP":["8.1","8.2","8.3","8.4"],"Ruby":["3.1","3.2","3.3","3.4"],"Rust":["1.75","1.78","1.80","1.82"],"Kotlin":["1.9","2.0","2.1"],"Scala":["2.13","3.3","3.4","3.5"],"Swift":["5.9","5.10","6.0"],"Dart":["3.2","3.3","3.4","3.5"],"R":["4.3","4.4"],"C/C++":["C17","C23","C++17","C++20","C++23"],"Elixir":["1.15","1.16","1.17"],"Solidity":["0.8.x"]};

export const LANGS_BY_TYPE={
  frontend:["JavaScript","TypeScript"],backend:["Java","Python","C#","Go","PHP","Ruby","Rust","Kotlin","Scala","Elixir"],
  fullstack:["JavaScript","TypeScript","Java","Python","C#","Go","PHP","Ruby","Elixir"],
  mobile_ios:["Swift"],mobile_android:["Kotlin","Java"],mobile_cross:["JavaScript","TypeScript"],mobile_flutter:["Dart"],
  qa:["JavaScript","TypeScript","Python","Java"],devops:["Python","Go","Rust"],security:["Python","Go","Rust","C/C++"],
  embedded:["C/C++","Rust","Python"],dba:["Python"],data:["Python","R","Scala","Java"],data_science:["Python","R"],
  ai:["Python","R"],ai_ops:["Python","Go"],blockchain:["Solidity","Rust","Go","JavaScript","TypeScript"],
};

export const ALL_FW={"Python":["Django","Flask","FastAPI","Celery","SQLAlchemy","Pandas","NumPy","PyTorch","TensorFlow","Keras","Hugging Face","LangChain","LlamaIndex","scikit-learn","OpenCV","spaCy","MLflow","Matplotlib","Airflow","dbt","Pydantic","Streamlit"],"Java":["Spring Boot","Spring Cloud","Spring Security","Micronaut","Quarkus","Hibernate","Apache Kafka","Maven","Gradle"],"JavaScript":["React","Angular","Vue.js","Next.js","Nuxt.js","Express.js","NestJS","Svelte","Astro","Electron","jQuery","Node.js","Remix","SolidJS","Hono","Bun","Deno"],"TypeScript":["React","Angular","Vue.js","Next.js","NestJS","tRPC","Prisma","Zod","Remix","SolidJS","Hono","Drizzle"],"C#":["ASP.NET Core","Blazor","Entity Framework",".NET MAUI","SignalR","WPF","Xamarin"],"Go":["Gin","Echo","Fiber","GORM","Cobra","Chi"],"PHP":["Laravel","Symfony","CodeIgniter","WordPress","Livewire"],"Ruby":["Ruby on Rails","Sinatra","Sidekiq","Hanami"],"Kotlin":["Ktor","Jetpack Compose","Spring Boot (Kotlin)","Coroutines"],"Swift":["SwiftUI","UIKit","Vapor","Combine"],"Dart":["Flutter","Riverpod","Bloc"],"Rust":["Actix","Axum","Tokio","Rocket","Diesel"],"R":["Shiny","ggplot2","tidyverse","caret"],"Scala":["Akka","Play Framework","ZIO","Spark"],"Elixir":["Phoenix","LiveView","Ecto","Nerves","Oban"],"Solidity":["Hardhat","Foundry","OpenZeppelin","Ethers.js","Wagmi"]};

export const FW_FILTER={
  frontend:{"JavaScript":["React","Angular","Vue.js","Next.js","Nuxt.js","Svelte","Astro","jQuery","Node.js","Remix","SolidJS","Hono"],"TypeScript":["React","Angular","Vue.js","Next.js","Zod","Remix","SolidJS","Hono","Drizzle"]},
  backend:{"Java":["Spring Boot","Spring Cloud","Spring Security","Micronaut","Quarkus","Hibernate","Apache Kafka","Maven","Gradle"],"Python":["Django","Flask","FastAPI","Celery","SQLAlchemy","Pydantic"],"C#":["ASP.NET Core","Entity Framework","SignalR"],"Go":["Gin","Echo","Fiber","GORM","Chi"],"PHP":["Laravel","Symfony","WordPress"],"Ruby":["Ruby on Rails","Sinatra","Sidekiq","Hanami"],"Kotlin":["Ktor","Spring Boot (Kotlin)"],"Rust":["Actix","Axum","Tokio","Rocket","Diesel"],"Scala":["Akka","Play Framework","ZIO"],"Elixir":["Phoenix","LiveView","Ecto","Oban"]},
  mobile_ios:{"Swift":["SwiftUI","UIKit","Combine"]},mobile_android:{"Kotlin":["Jetpack Compose","Coroutines"],"Java":["Spring Boot"]},
  mobile_cross:{"JavaScript":["React","Node.js"],"TypeScript":["React"]},mobile_flutter:{"Dart":["Flutter","Riverpod","Bloc"]},
  qa:{"JavaScript":["Node.js"],"TypeScript":["Zod"],"Python":["Flask","FastAPI"],"Java":["Spring Boot"]},
  data:{"Python":["Pandas","NumPy","Airflow","dbt","SQLAlchemy","Matplotlib","Pydantic","Streamlit"],"Scala":["Spark","Akka"],"R":["Shiny","ggplot2","tidyverse"]},
  data_science:{"Python":["Pandas","NumPy","scikit-learn","Matplotlib","TensorFlow","PyTorch","Keras","Streamlit"],"R":["ggplot2","tidyverse","caret","Shiny"]},
  ai:{"Python":["PyTorch","TensorFlow","Keras","Hugging Face","LangChain","LlamaIndex","scikit-learn","OpenCV","spaCy","MLflow","Pandas","NumPy","Pydantic","Streamlit"],"R":["caret","tidyverse"]},
  ai_ops:{"Python":["MLflow","Airflow","FastAPI","Pydantic"],"Go":["Gin","Cobra"]},
  blockchain:{"Solidity":["Hardhat","Foundry","OpenZeppelin","Ethers.js","Wagmi"],"Rust":["Actix","Tokio"],"JavaScript":["Node.js","React","Next.js"],"TypeScript":["React","Next.js","Prisma"]},
};

export const FW_V={"Django":["4.2 LTS","5.0","5.1"],"Flask":["2.x","3.x"],"FastAPI":["0.109+","0.115+"],"Pandas":["2.0","2.1","2.2"],"PyTorch":["2.0","2.1","2.2","2.3","2.4"],"TensorFlow":["2.14","2.15","2.16","2.17"],"Keras":["2.x","3.x"],"Hugging Face":["4.35+","4.40+","4.45+"],"LangChain":["0.1","0.2","0.3"],"scikit-learn":["1.3","1.4","1.5"],"OpenCV":["4.8","4.9","4.10"],"Spring Boot":["2.7","3.0","3.1","3.2","3.3"],"Spring Cloud":["2022.x","2023.x","2024.x"],"Spring Security":["5.8","6.0","6.2","6.3"],"Micronaut":["3.x","4.x"],"Quarkus":["3.8","3.12","3.15"],"Hibernate":["5.6","6.2","6.4","6.6"],"React":["17","18","19"],"Angular":["15","16","17","18","19"],"Vue.js":["2","3"],"Next.js":["13","14","15"],"Nuxt.js":["2","3"],"Express.js":["4.x","5.x"],"NestJS":["9","10"],"Svelte":["3","4","5"],"Astro":["3.x","4.x","5.x"],"ASP.NET Core":["6","7","8","9"],"Blazor":["7","8","9"],"Entity Framework":["6","7","8","9"],".NET MAUI":["8","9"],"Laravel":["10","11"],"Symfony":["6.x","7.x"],"Ruby on Rails":["7.0","7.1","7.2"],"Flutter":["3.16","3.19","3.22","3.24"],"Jetpack Compose":["1.5","1.6","1.7"],"SwiftUI":["5.x","6.x"],"Vapor":["4.x"],"Actix":["4.x"],"Axum":["0.7","0.8"],"Ktor":["2.x"],"Gin":["1.9","1.10"],"Fiber":["2.x","3.x"],"Spark":["3.4","3.5"],"Electron":["29","30","31"],"Node.js":["18 LTS","20 LTS","22"],"Airflow":["2.7","2.8","2.9"],"Remix":["2.x"],"SolidJS":["1.8","1.9"],"Hono":["3.x","4.x"],"Bun":["1.0","1.1"],"Deno":["1.x","2.x"],"Phoenix":["1.7","1.8"],"LiveView":["0.19","0.20"],"Hardhat":["2.x"],"Foundry":["0.2"],"Drizzle":["0.30+"],"Pydantic":["1.x","2.x"],"Streamlit":["1.30+","1.35+"]};

// ═══════════ CLOUD SERVICES BY PROVIDER ═══════════
export const CLOUD_SERVICES={
  "AWS":["EC2","S3","Lambda","RDS","DynamoDB","ECS","EKS","CloudFront","SQS","SNS","API Gateway","Cognito","CloudWatch","Redshift","Athena","Glue","SageMaker","Step Functions","EventBridge","Route 53","IAM","Secrets Manager","CodePipeline","Elastic Beanstalk"],
  "Azure":["App Service","Functions","Blob Storage","SQL Database","Cosmos DB","AKS","Container Apps","DevOps","Active Directory","Key Vault","Monitor","Data Factory","Synapse","Cognitive Services","Logic Apps","Service Bus","Event Hub","Front Door","API Management"],
  "GCP":["Compute Engine","Cloud Run","Cloud Functions","Cloud Storage","BigQuery","Cloud SQL","GKE","Pub/Sub","Dataflow","Vertex AI","Cloud Build","Firebase","Firestore","Cloud CDN","Spanner","Memorystore","Cloud Armor","Anthos"],
  "Huawei Cloud":["ECS","OBS","FunctionGraph","RDS","GaussDB","CCE","API Gateway","DIS","ModelArts"],
  "Oracle Cloud":["Compute","Object Storage","Autonomous DB","Container Engine","Functions","API Gateway","Streaming"],
  "IBM Cloud":["Virtual Servers","Object Storage","Db2","Kubernetes","Functions","Watson AI","Event Streams"],
  "DigitalOcean":["Droplets","Spaces","Managed DB","App Platform","Kubernetes","Functions","Load Balancers"],
  "Cloudflare":["Workers","Pages","R2","D1","KV","Queues","AI","WAF","CDN","DNS"],
  "Vercel":["Serverless Functions","Edge Functions","KV","Blob","Postgres","Analytics"],
  "Netlify":["Functions","Edge Functions","Blob Storage","Forms","Identity"],
};

export const DBS=["PostgreSQL","MySQL","MariaDB","MongoDB","Redis","DynamoDB","Cosmos DB","SQL Server","Oracle DB","Cassandra","Elasticsearch","Neo4j","ClickHouse","Supabase","Firebase","CockroachDB","SQLite"];
export const DB_V={"PostgreSQL":["13","14","15","16","17"],"MySQL":["5.7","8.0","8.4","9.0"],"MariaDB":["10.6","10.11","11.4"],"MongoDB":["5.0","6.0","7.0","8.0"],"Redis":["6.2","7.0","7.2","7.4"],"SQL Server":["2017","2019","2022"],"Oracle DB":["19c","21c","23ai"],"Cassandra":["4.0","4.1","5.0"],"Elasticsearch":["7.17","8.x"],"Neo4j":["4.4","5.x"],"ClickHouse":["23.x","24.x"],"CockroachDB":["23.x","24.x"],"SQLite":["3.x"]};
export const DEVOPS=["Docker","Kubernetes","Terraform","Ansible","Pulumi","Jenkins","GitHub Actions","GitLab CI/CD","ArgoCD","Helm","Prometheus","Grafana","Datadog","New Relic","CircleCI","AWS CDK","Nginx","Apache","Traefik","Istio","Consul","Vault","Terraform Cloud","Backstage","Flux CD"];
export const DEVOPS_V={"Docker":["24","25","26","27"],"Kubernetes":["1.27","1.28","1.29","1.30","1.31"],"Terraform":["1.5","1.6","1.7","1.8","1.9"],"Ansible":["2.14","2.15","2.16","2.17"],"Pulumi":["3.x"],"Helm":["3.x"],"ArgoCD":["2.9","2.10","2.11","2.12"],"Prometheus":["2.x"],"Grafana":["10.x","11.x"],"Nginx":["1.24","1.25","1.26"],"Istio":["1.20","1.21","1.22"],"Vault":["1.15","1.16","1.17"],"Terraform Cloud":["Latest"]};
export const ERP_T=["AL Language","C/AL","Power Apps","Power Automate","Power BI","Dataverse","Business Central","NAV","D365 F&O","X++","SAP ABAP","SAP Fiori","SAP S/4HANA"];
export const ERP_V={"Business Central":["BC 21","BC 22","BC 23","BC 24","BC 25"],"NAV":["NAV 2017","NAV 2018"],"D365 F&O":["10.0.38+","10.0.39+","10.0.40+"],"Power BI":["Desktop","Service","Embedded"],"SAP S/4HANA":["2021","2022","2023"]};
export const QA_TOOLS=["Selenium","Cypress","Playwright","Jest","Mocha","JUnit","TestNG","Appium","Postman","K6","JMeter","Cucumber","Robot Framework","Allure","BrowserStack","Sauce Labs","Percy","Storybook"];

// ═══════════ AI TOOLS (expanded) ═══════════
export const AI_TOOLS=["Claude","GitHub Copilot","Cursor","Gemini","Tabnine","Amazon CodeWhisperer","ChatGPT","Copilot for M365","v0 by Vercel","Replit AI","Codeium","Windsurf","Devin","Lovable","Bolt","Perplexity","Notion AI","Jasper","Midjourney","Stable Diffusion","DALL-E","Claude Code","Amazon Q","Pieces","Continue.dev","Sourcegraph Cody","None required"];

// ═══════════ PROFESSIONAL TOOLS (non-technical hard skills) ═══════════
export const PROF_TOOLS={
  management:{
    "Project Management":["Jira","Asana","Monday.com","Trello","ClickUp","Smartsheet","Microsoft Project","Basecamp","Linear","Shortcut"],
    "Product & Roadmap":["Productboard","Aha!","Pendo","Amplitude","Mixpanel","Hotjar","FullStory","LaunchDarkly","Statsig"],
    "Documentation":["Confluence","Notion","Coda","GitBook","Google Docs","SharePoint"],
    "Design & Wireframing":["Figma","Miro","Whimsical","Lucidchart","Balsamiq","FigJam"],
    "Analytics":["Google Analytics","Tableau","Looker","Power BI","Metabase","Heap"],
    "Communication":["Slack","Microsoft Teams","Zoom","Loom","Calendly"],
    "Agile & Process":["Scrum","Kanban","SAFe","OKR","RICE","MoSCoW","Story Mapping","Sprint Planning","Retrospectives"],
  },
  commercial:{
    "CRM":["Salesforce","HubSpot","Pipedrive","Zoho CRM","Dynamics 365 CRM","Close","Freshsales"],
    "Sales Engagement":["Apollo.io","Outreach","SalesLoft","Gong","Chorus","ZoomInfo","LinkedIn Sales Navigator","Lusha"],
    "Proposals & Contracts":["PandaDoc","Proposify","DocuSign","HelloSign","Qwilr","Better Proposals"],
    "Marketing Automation":["HubSpot Marketing","Marketo","Mailchimp","ActiveCampaign","Pardot","Intercom"],
    "Analytics & Reporting":["Tableau","Google Analytics","Looker","Power BI","Google Data Studio","Mixpanel"],
    "Communication":["Slack","Microsoft Teams","Zoom","Calendly","Loom","Vidyard"],
    "Customer Success":["Gainsight","Totango","ChurnZero","Vitally","Planhat","CustomerIO"],
  },
  support_ops:{
    "ITSM & Ticketing":["ServiceNow","Jira Service Management","Zendesk","Freshdesk","Freshservice","ManageEngine","BMC Remedy"],
    "Monitoring & Alerting":["Nagios","Zabbix","Datadog","PagerDuty","OpsGenie","New Relic","Grafana","Prometheus","Splunk"],
    "Networking":["Cisco","Juniper","Fortinet","Palo Alto","Meraki","Ubiquiti","Aruba","F5"],
    "Operating Systems":["Windows Server","Linux (RHEL/CentOS)","Linux (Ubuntu/Debian)","macOS","VMware ESXi","Hyper-V"],
    "Cloud Administration":["AWS Console","Azure Portal","GCP Console","Microsoft 365 Admin","Google Workspace Admin"],
    "Security":["CrowdStrike","SentinelOne","Okta","Azure AD","Active Directory","GPO","SCCM/Intune"],
    "Backup & Recovery":["Veeam","Acronis","Commvault","AWS Backup","Azure Backup","Zerto"],
  },
  clevel:{
    "Strategy & Governance":["OKR Frameworks","Balanced Scorecard","TOGAF","ITIL","COBIT","ISO 27001","SOC 2"],
    "Financial":["SAP","Oracle ERP","NetSuite","QuickBooks","Xero","Anaplan","Adaptive Insights"],
    "BI & Analytics":["Tableau","Power BI","Looker","ThoughtSpot","Sisense","Domo","Qlik"],
    "Collaboration":["Notion","Confluence","Slack","Microsoft Teams","Asana","Monday.com"],
    "Security & Compliance":["CrowdStrike","Okta","Qualys","Tenable","Rapid7","Snyk","Wiz"],
    "Cloud Platforms":["AWS","Azure","GCP","Huawei Cloud","Oracle Cloud","Multi-cloud Strategy"],
    "Vendor Management":["ServiceNow","Coupa","SAP Ariba","Ivalua","Gartner","Forrester"],
  },
};

// Which categories use professional tools instead of programming languages
export const PROF_TOOL_CATEGORIES=["management","commercial","support_ops","clevel"];

// Helper: check if a category uses professional tools
export function usesProfTools(cat){return PROF_TOOL_CATEGORIES.includes(cat)}

// ═══════════ TECH COHERENCE WARNINGS ═══════════
// Map of role type → allowed framework categories
export const TECH_WARNINGS={
  frontend:{bad:["Django","Flask","FastAPI","Spring Boot","Spring Cloud","Spring Security","Hibernate","Express.js","NestJS","Laravel","Ruby on Rails","Gin","Fiber"],msg:"These are backend frameworks — consider if a Frontend role really needs them."},
  backend:{bad:["React","Angular","Vue.js","Next.js","Nuxt.js","Svelte","Astro","jQuery","Jetpack Compose","SwiftUI","UIKit","Flutter"],msg:"These are frontend/mobile frameworks — unusual for a Backend role."},
  mobile_ios:{bad:["Django","Flask","Spring Boot","Laravel","Express.js","React","Angular","Vue.js"],msg:"These frameworks don't align with iOS development."},
  mobile_android:{bad:["Django","Flask","Spring Cloud","Laravel","Express.js","React","Angular","Vue.js","SwiftUI","UIKit"],msg:"These frameworks don't align with Android development."},
};

// ═══════════ CONSTANTS ═══════════
export const SENIORITY=["Junior","Mid","Senior","Lead","Director","VP","C-Level"];
export const EXP_RANGES=["1-2 years","2-4 years","4-6 years","6-8 years","8-10 years","10-15 years","15+ years"];
export const ENGLISH=["A1 - Beginner","A2 - Elementary","B1 - Intermediate","B2 - Upper Intermediate","C1 - Advanced","C2 - Proficient","Native"];
export const LOCATIONS=["LATAM","USA","LATAM or USA"];
export const TIMEZONES=["EST (UTC-5)","CST (UTC-6)","MST (UTC-7)","PST (UTC-8)","COT (UTC-5)","ART (UTC-3)","BRT (UTC-3)","CLT (UTC-3)","PET (UTC-5)","Remote-flexible"];
export const METHODOLOGIES=["Scrum","Kanban","SAFe","Waterfall","Lean","XP","Scrumban","Hybrid"];
export const ACADEMIA=["No degree required","Associate","Bachelor's","Master's","PhD","Bootcamp / Certification"];
export const INDUSTRIES=["Fintech","Healthcare","E-commerce","SaaS","Cybersecurity","EdTech","InsurTech","Logistics","Retail","Manufacturing","Real Estate","Telecom","Gaming","Media","Government","Energy","Automotive","Travel","Agriculture"];
export const ENGAGEMENT_TYPES=["Full-time (40h/week)","Part-time (20h/week)","By Hours"];
export const HOUR_OPTIONS=Array.from({length:17},(_,i)=>`${i+6}:00`);
export const HOLIDAY_COUNTRIES=["Mexico","USA","Canada"];

export const STEPS=["Client","Upload","Category","Experience","Stack","Priorities","Details","Review"];
export const STEP_INFO={
  "Client":"👋 Hey there! Let's start by getting to know you. Your name and company help us personalize everything — from your profile document to the communication with our recruitment team.",
  "Upload":"📄 Got a job description handy? Drop it here and our AI will extract the role, stack, and requirements in seconds. No file? No worries — skip ahead and build from scratch!",
  "Category":"🎯 What kind of talent are you hunting for? Pick the professional area first, then drill down into the specific role. This helps us filter the right tech stacks and frameworks for you.",
  "Experience":"⚡ Now let's define the level. How senior should this person be? How many years in the trenches? And what kind of schedule works — full-time, part-time, or flexible hours?",
  "Stack":"🛠️ The fun part! Build your ideal tech stack piece by piece — languages, frameworks, cloud providers, databases, and DevOps tools. We'll show you what's relevant for the role you picked.",
  "Priorities":"🔥 Not everything is equally important. Drag your selected technologies into Must Have (deal-breakers) or Nice to Have (bonus points). This directly shapes how we evaluate candidates.",
  "Details":"🌍 Almost there! Set the English level, location preference, methodology, industry, and any other specifics that matter for this role. The more detail, the better the match.",
  "Review":"🚀 Final check! Review your entire profile request, see the completeness score, adjust the skills balance, and submit. You'll get a professional PDF document and we'll start sourcing immediately.",
};

export const STATUS_LABELS={new:"New",pending_review:"Pending Review",pending_soft:"Pending Soft Skills",in_progress:"In Progress",sourcing:"Sourcing",filled:"Filled",closed:"Closed"};
export const STATUS_COLORS={new:"#3b82f6",pending_review:"#f97316",pending_soft:"#8b5cf6",in_progress:"#f59e0b",sourcing:"#06b6d4",filled:"#10b981",closed:"#64748b"};

// ═══════════ HELPERS ═══════════
export const toggle=(a,i)=>a.includes(i)?a.filter(x=>x!==i):[...a,i];
export const esc=(s)=>String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export function formatVersions(v){return Object.entries(v||{}).filter(([_,x])=>x&&x.length).map(([t,x])=>x.includes("any")?`${t}: Any`:`${t}: ${x.join(", ")}`)}
export function calcEndTime(start,hours){if(!start)return"";const[h]=start.split(":").map(Number);const end=h+hours;return end>23?`${end-24}:00 (+1d)`:`${end}:00`}
export function getFilteredLangs(cat,role){
  const t=ROLE_TYPE[role];if(!t||cat==="tech_lead"||cat==="clevel")return Object.keys(ALL_LANGS);
  if(cat==="management"||cat==="commercial"||cat==="support_ops")return["Python","JavaScript"];
  if(cat==="erp")return["Python","C#","JavaScript"];return LANGS_BY_TYPE[t]||Object.keys(ALL_LANGS);
}
export function getFilteredFW(cat,role,lang){
  const t=ROLE_TYPE[role];if(!t||cat==="tech_lead"||cat==="clevel")return ALL_FW[lang]||[];
  const fm=FW_FILTER[t];if(fm&&fm[lang])return fm[lang];return ALL_FW[lang]||[];
}
export function showDBs(c,r){const t=ROLE_TYPE[r];return!t||["backend","fullstack","devops","dba","data","data_science","ai","ai_ops"].includes(t)||["tech_lead","clevel","erp"].includes(c)}
export function showDevOps(c,r){const t=ROLE_TYPE[r];return!t||["backend","fullstack","devops","security","ai_ops"].includes(t)||["tech_lead","clevel"].includes(c)}
export function showQATools(r){return["QA Engineer","QA Automation Engineer","SDET"].includes(r)}
export function getTechWarnings(roleType,selectedFW){
  const w=TECH_WARNINGS[roleType];if(!w)return null;
  const flagged=selectedFW.filter(f=>w.bad.includes(f));
  if(!flagged.length)return null;
  return{frameworks:flagged,message:w.msg};
}

// ═══════════ DOCUMENT TYPES ═══════════
export const DOC_TYPES={cv:"CV / Resume",soft_eval:"Soft Skills Evaluation",hard_eval:"Hard Skills Evaluation"};
export const DOC_ICONS={cv:"📄",soft_eval:"🧠",hard_eval:"⚙️"};
export const MAX_DOC_SIZE=10*1024*1024; // 10MB

// ═══════════ PRIVACY POLICY ═══════════
export const PRIVACY_CONTENT=`<h2>Privacy Policy</h2><p><strong>Last updated:</strong> January 2024</p>
<h3>1. Information We Collect</h3><p>BOZ IT Staffing ("BOZ", "we", "us") collects information you provide directly through the Verified Fit platform, including your name, company, email address, and job profile requirements. For candidates, we collect professional information such as skills, experience, and uploaded evaluation documents.</p>
<h3>2. How We Use Your Information</h3><p>We use collected information exclusively for IT staffing purposes: matching candidates to job profiles, generating profile documents, facilitating the recruitment process, and communicating with clients about their requests.</p>
<h3>3. Data Storage & Security</h3><p>All data is stored securely using industry-standard encryption. We use Supabase for database storage with row-level security policies. Documents are stored in encrypted cloud storage with signed, time-limited access URLs.</p>
<h3>4. Data Sharing</h3><p>We do not sell, trade, or rent your personal information. Profile data and candidate information are shared only between the hiring client and BOZ recruitment team as part of the staffing process.</p>
<h3>5. Data Retention</h3><p>We retain client profile data and candidate information for the duration of the recruitment engagement plus 12 months. You may request deletion of your data at any time by contacting us.</p>
<h3>6. Your Rights</h3><p>You have the right to access, correct, or delete your personal data. You may also withdraw consent for data processing at any time. Contact us at privacy@bozusa.com for any data-related requests.</p>
<h3>7. Cookies</h3><p>The Verified Fit platform uses only essential authentication tokens stored in local storage. We do not use tracking cookies or third-party analytics.</p>
<h3>8. Contact</h3><p>For privacy inquiries: <strong>privacy@bozusa.com</strong></p>`;

// ═══════════ TERMS AND CONDITIONS ═══════════
export const TERMS_CONTENT=`<h2>Terms and Conditions</h2><p><strong>Last updated:</strong> January 2024</p>
<h3>1. Acceptance of Terms</h3><p>By accessing and using the BOZ Verified Fit platform, you agree to be bound by these Terms and Conditions. If you do not agree, please discontinue use immediately.</p>
<h3>2. Service Description</h3><p>BOZ Verified Fit is an IT staffing profile builder that allows clients to define technical requirements for IT roles. BOZ uses these profiles to source, evaluate, and present qualified candidates.</p>
<h3>3. Account Responsibility</h3><p>You are responsible for maintaining the confidentiality of your account access. You agree to notify BOZ immediately of any unauthorized use of your account.</p>
<h3>4. Intellectual Property</h3><p>All content, branding, design, and technology of the Verified Fit platform are the property of BOZ, Empowering IT Solutions. Profile documents generated through the platform are provided for the exclusive use of the requesting client.</p>
<h3>5. Candidate Information</h3><p>Candidate profiles and evaluation documents shared through the platform are confidential. Clients agree not to share candidate information with third parties without BOZ's written consent.</p>
<h3>6. Limitation of Liability</h3><p>BOZ provides the Verified Fit platform "as is" and makes no warranties regarding candidate availability, fit accuracy, or hiring outcomes. BOZ's liability is limited to the fees paid for the specific staffing engagement.</p>
<h3>7. Confidentiality</h3><p>Both parties agree to maintain confidentiality of all information exchanged through the platform, including but not limited to job requirements, candidate profiles, and evaluation results.</p>
<h3>8. Termination</h3><p>BOZ reserves the right to suspend or terminate access to the platform for violation of these terms or for any conduct deemed harmful to BOZ or its users.</p>
<h3>9. Governing Law</h3><p>These terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration.</p>
<h3>10. Contact</h3><p>For questions about these terms: <strong>legal@bozusa.com</strong></p>`;

