# PROJECT_CONTEXT.md
## PMO - FC - Governance
AI-Powered Fixed Cost Project Planning & Estimation Tool

---

## 1) Goal (Why this exists)
This tool is designed for Project Managers working on Fixed Cost projects.

It helps PMs quickly generate a complete planning pack from high-level scope.

The output must be structured, editable, and suitable for:
- Estimation
- Planning
- Sprint breakup
- Test strategy
- Architecture overview
- Timeline and delivery plan

The purpose is to create fast AI-powered demo prototypes for customers to show speed and capability.

---

## 2) Target Users
- Project Manager (Primary)
- Delivery Head (Reviewer)
- Sales (Viewer - optional future)
- QA Lead (Reviewer - optional future)

---

## 3) Core Workflow (MVP)
### Step 1: Create a Project
PM enters:
- Project Name
- Client Name (optional)
- Project Type (Fixed Cost only for MVP)
- Sprint duration (1 week / 2 weeks)
- Start date assumption (optional)
- Team model selection (small/medium/large)

### Step 2: Provide Scope
PM can provide requirements in one of these forms:
- Paste scope text
- Upload a PDF (scope document)

Notes:
- Uploaded files must be processed in-memory only.
- Do not store raw files locally.

### Step 3: Select Tech Stack
PM selects:
- Frontend: React / Angular / Next.js
- Backend: Node.js / Java / .NET / Python
- Database: Postgres / MySQL / MongoDB
- Cloud: AWS / Azure
- CI/CD: GitHub Actions / Azure DevOps
- Authentication: Basic / SSO (optional)

### Step 4: Generate Plan (AI)
PM clicks "Generate Project Plan".

The system calls AI and generates a structured plan output.

### Step 5: Review and Export
PM can:
- View outputs in tabs/sections
- Copy to clipboard
- Download as JSON
- (Optional future) Export to Excel/PDF

---

## 4) Outputs Required (MVP)
The AI-generated output MUST include:

1. Requirement summary
2. Module breakdown
3. Detailed task breakdown (WBS)
4. Task-wise assumptions
5. Task dependencies
6. Effort estimation per task:
   - Design
   - Frontend
   - Backend
   - Testing
7. Unit test cases per task
8. System test cases per task
9. Regression test suite
10. High-level technical architecture
11. Mind map structure
12. Resource loading plan
13. Sprint breakup and release plan
14. Final timeline with milestones

All output must follow the JSON schema defined in CURSOR_RULES.md.

---

## 5) Quality Expectations (Very Important)
This is not a "perfect estimation tool".
This is a "high quality planning accelerator".

Expected accuracy:
- AI gives ~70–80% useful output
- PM reviews and finalizes the rest

Outputs must be:
- structured
- consistent
- professional
- client-presentable

---

## 6) MVP Screen List
### Screen 1: Dashboard
- List of created projects
- Create new project button

### Screen 2: Create Project
- Project name
- Project type (Fixed Cost)
- Sprint duration
- Team model
- Tech stack selectors
- Scope input (text + PDF upload)

### Screen 3: Generated Output View
Tabs/Sections:
- Summary
- Modules
- Tasks (WBS)
- Assumptions & Dependencies
- Effort Table
- Unit Test Cases
- System Test Cases
- Regression Suite
- Architecture
- Mind Map
- Resource Loading
- Sprint Plan
- Timeline

### Screen 4: Project History (Optional MVP+)
- Track previous generations (versioning)

---

## 7) Data Persistence (MVP)
If DB is implemented, store:
- Project metadata
- Scope extracted text (not raw file)
- Tech stack selections
- Generated JSON output
- Created date/time

Use PostgreSQL + Prisma.

Do NOT store:
- raw PDF files
- scope documents on local disk

---

## 8) AI Design Guidelines
The AI generation should be done in steps (preferred):
1. Summarize requirements
2. Identify modules
3. Break modules into tasks
4. Add assumptions/dependencies
5. Estimate efforts
6. Generate unit/system tests
7. Generate regression suite
8. Create sprint plan
9. Create resource loading
10. Create final timeline

If needed for MVP speed, a single AI call is acceptable, but output must still be valid JSON.

---

## 9) Estimation Defaults (MVP Assumptions)
Use sensible default assumptions:
- 1 sprint = 2 weeks (default)
- 1 dev capacity = 30 productive hours/week
- QA capacity = 30 productive hours/week
- Include buffer for review, bug fixes, integration
- Mention assumptions clearly in output

---

## 10) Non-Goals (Out of Scope for MVP)
Do NOT implement in MVP:
- Full Figma API integration
- Real Jira integration
- Real Azure DevOps integration
- Real GitHub project board generation
- Complex role-based access control
- Billing, margins, cost calculation
- Multi-client tenanting

---

## 11) Definition of Success (MVP)
MVP is successful if:
- PM can input scope + tech stack
- System generates complete planning pack
- Output is structured and readable
- No lint/TypeScript errors
- No local file storage
- Demo can be shown to customers in 5 minutes
