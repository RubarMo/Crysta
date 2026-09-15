# Git Branching & Promotion Protocol

Always adhere strictly to this protocol before inspecting, creating, or modifying any code in this repository:

1. **Verify Active Branch First:**
   - Always run `git branch --show-current` before modifying any files.
   
2. **Never Commit Directly to Protected Branches:**
   - NEVER make code changes or commit directly on `main` or `development`.
   
3. **Branch Creation:**
   - If currently on `main` or `development`, create and checkout a new branch (e.g. `feature/<name>` or `fix/<name>`) before writing any code or making edits.
   
4. **Strict Promotion Flow (Local Testing & User Approval Required):**
   - All work begins and stays on a dedicated feature/fix branch (`feature/<name>` or `fix/<name>`).
   - No Pushing Before Local Testing: While on the new branch, do NOT push changes to remote until the USER has tested them locally and confirmed.
   - DO NOT merge into `development` or `main` automatically.
   - Wait for the USER to test the changes locally and explicitly confirm they work (e.g. "it works", "merge it").
   - ONLY after the user confirms it works:
     1. Push the tested branch.
     2. Merge feature branch into `development` and push.
     3. Merge `development` into `main` (production) and push.
   - Never push feature branch commits directly to `main`.

5. **Branch Hygiene:**
   - Do NOT touch, update, backport changes to, or merge into old/stale branches (e.g., `refactor_...`).
   - Do NOT create unsolicited git worktrees. Keep all work cleanly in the primary repository workspace.
