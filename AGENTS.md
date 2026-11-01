# AGENTS.md

Instructions for every AI coding agent working in this repo. Claude Code loads this file through `CLAUDE.md`, and Codex loads it directly. Add shared agent instructions here, not in `CLAUDE.md`.

## Before you do anything

Complete these steps before you edit files, run commands that change state, or propose an implementation:

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) in full. It holds the product rules, database design, and API.
2. Read [docs/backend-plan.md](docs/backend-plan.md) in full. It holds the milestones, build order, and testing requirements.
3. Run `git status` and `git branch --show-current`. Don't overwrite or discard uncommitted work you didn't make.

If you start this repo in a new session, or your context is reset, do these steps again.

## While you work

- Work through the milestones in order, with one PR per milestone. Reference the GitHub issue in each PR.
- If a task conflicts with `ARCHITECTURE.md` or the plan, stop and ask before going further.
- Update `ARCHITECTURE.md` in the same PR as any change to the schema, RPCs, or rules. Once migrations exist, they win if the two disagree.

## Commands

| Command | What it does |
| --- | --- |
| `npm run db:start` | Starts local Supabase |
| `npm run db:stop` | Stops local Supabase |
| `npm run db:reset` | Rebuilds the local database from migrations |
| `npm test` | Runs the database tests |
| `npm run test:functions` | Runs the Edge Function tests |

## Design

Use a warm, clean, modern design with a soft white background and warm orange accents.

### Color Palette
- Background: Warm white #FFFAF4
- Card surfaces: Creamy white #FFFDF9
- Primary orange: #EAA647
- Secondary yellow: #F5C85C
- Accent peach: #F29B65
- Primary text: Dark brown #35251D
- Secondary text: Muted warm gray
- Card borders: Very light warm beige
- The UI should feel welcoming, minimalist, youthful, and premium.
- Avoid dark mode, purple accents, overly saturated backgrounds, and unnecessary decorative elements.

###Design Details

- Rounded cards with approximately 24px corners.
- Soft shadows beneath cards.
- Smooth layered depth.
- Generous spacing.
- Clean, modern typography.
- Large request imagery.
- Thin, consistent line icons.
- Subtle orange highlights.
- No unnecessary headings or onboarding instructions.
- The overall screen must closely resemble the latest reference rather than an AI-generated generic social media interface.
