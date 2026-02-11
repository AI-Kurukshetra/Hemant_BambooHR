# CURSOR_RULES.md
## Purpose
This repository contains an AI-powered Fixed Cost Project Planning & Estimation tool.
Cursor must generate clean, production-grade code with strict linting and predictable outputs.

---

## 1) Golden Rules (Must Follow Always)
You are a senior full-stack engineer.

You MUST follow these rules strictly in every code change:

- Use TypeScript everywhere. No JavaScript.
- Code must have ZERO lint errors.
- Code must have ZERO TypeScript errors.
- Do NOT use `any`, `unknown`, or unsafe type casts.
- Do NOT leave unused imports, variables, or functions.
- Do NOT use `console.log`.
- Do NOT write placeholder code or TODOs unless explicitly asked.
- Keep code modular, readable, and maintainable.
- Use consistent naming conventions across the repo.
- Add proper error handling for all API calls and async flows.
- Use environment variables for secrets and API keys.
- Ensure code is production-grade, not demo-grade.

---

## 2) Tech Stack (Fixed — Do Not Change)
Use ONLY the following stack unless explicitly asked to change:

- Next.js (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui for UI components
- Zod for validation
- React Hook Form for forms
- Prisma (if DB is required)
- PostgreSQL (preferred DB if persistence is required)

Do NOT introduce extra libraries unless absolutely required.
If a new library is needed, explain WHY before adding it.

---

## 3) Project Requirements (Core Functionality)
The app is used by Project Managers for Fixed Cost projects.

Inputs:
- PM can upload scope / high-level requirements (text or PDF)
- PM can optionally provide Figma screens or links (optional)
- PM can select tech stack:
  - Frontend
  - Backend
  - Database
  - Cloud (AWS/Azure)
  - CI/CD

Outputs (AI generated):
1. Detailed task breakdown (WBS)
2. Task-wise assumptions
3. Dependencies
4. Effort breakup by:
   - Design
   - Frontend
   - Backend
   - Testing
5. Unit test cases for every task
6. System test cases for every task
7. Regression test suite
8. Tech architecture (high-level)
9. Mind map (text-based structure or data)
10. Resource loading plan
11. Sprint breakup + release plan
12. Final timeline

---

## 4) AI Output Rules (Extremely Important)
All AI responses MUST be structured and parseable.

The main AI output MUST be strictly valid JSON.
No markdown, no commentary, no extra text.

Use this JSON shape:

{
  "summary": string,
  "modules": [
    {
      "id": string,
      "name": string,
      "description": string
    }
  ],
  "tasks": [
    {
      "id": string,
      "moduleId": string,
      "title": string,
      "description": string,
      "assumptions": string[],
      "dependencies": string[],
      "effortHours": {
        "design": number,
        "frontend": number,
        "backend": number,
        "testing": number
      }
    }
  ],
  "unitTestCases": [
    {
      "taskId": string,
      "cases": [
        {
          "id": string,
          "title": string,
          "steps": string[],
          "expectedResult": string
        }
      ]
    }
  ],
  "systemTestCases": [
    {
      "taskId": string,
      "cases": [
        {
          "id": string,
          "title": string,
          "steps": string[],
          "expectedResult": string
        }
      ]
    }
  ],
  "regressionSuite": [
    {
      "id": string,
      "title": string,
      "scope": string,
      "cases": string[]
    }
  ],
  "architecture": {
    "overview": string,
    "components": string[],
    "dataFlow": string[],
    "securityNotes": string[]
  },
  "mindMap": {
    "root": string,
    "nodes": [
      {
        "id": string,
        "parentId": string | null,
        "title": string
      }
    ]
  },
  "resourceLoading": [
    {
      "role": string,
      "count": number,
      "allocation": [
        {
          "week": number,
          "hoursPerWeek": number
        }
      ]
    }
  ],
  "sprintPlan": [
    {
      "sprintNumber": number,
      "durationWeeks": number,
      "goals": string[],
      "taskIds": string[]
    }
  ],
  "timeline": {
    "totalWeeks": number,
    "startAssumption": string,
    "milestones": [
      {
        "name": string,
        "week": number,
        "deliverables": string[]
      }
    ]
  }
}

---

## 5) Data Storage Rule (Very Important)
NOTHING should be stored in local machine space.

- Do NOT write uploaded files to local disk.
- Do NOT store PDFs or scope files in `/tmp`, `/uploads`, or any folder.
- Do NOT persist user uploads in the repository or server file system.
- Uploaded scope must be processed in-memory only.

If persistence is required:
- Store only extracted text (not the raw file)
- Store structured JSON outputs in PostgreSQL (preferred)
- If storing files is required in future, use cloud storage (S3/Azure Blob), not local disk.

---

## 6) Coding Style Rules
- Prefer pure functions
- Prefer async/await (no .then chains)
- Use early returns
- Use `const` by default (avoid `let`)
- Avoid deeply nested code
- Keep UI components clean; move logic into `/lib`
- Add Zod validation for every API input
- Keep code DRY and reusable

---

## 7) Folder Structure (Strict)
Use this structure:

- `/app` → routes, pages, layouts
- `/components` → reusable UI components
- `/lib` → AI logic, parsing, helpers, exporters
- `/types` → shared TypeScript types
- `/config` → constants, prompts, defaults

Do not create random folders.

---

## 8) Before Finalizing Any Code
Before finalizing output, ALWAYS:
- fix lint issues
- fix TypeScript issues
- remove unused imports
- ensure code compiles
- ensure output JSON is valid and matches schema
