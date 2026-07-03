Initialize a new Tauri v2 project using React, TypeScript, and Tailwind CSS. The application is a native Windows desktop writing tool named "Snowflake Arabic" designed to replicate and expand upon the legacy 'Snowflake Pro' software. 

The entire application MUST be built for the Arabic language (Right-to-Left orientation). You are restricted to using Gemini 3.5 Flash's large context window to build a complete, runnable application.

Execute the following architectural steps sequentially:

### 1. Core Framework & Configuration

- Scaffold a Tauri v2 app using React and Vite.
- Install and configure Tailwind CSS.
- In `index.html`, set `<html lang="ar" dir="rtl">` to enforce native bidirectional text rendering. 
- Ensure all Tailwind classes use logical properties (e.g., `ms-` for margin-start, `pe-` for padding-end, `border-s` for border-start). Do not use directional properties like `ml-` or `pr-`.
- Implement a Dark/Light mode toggle in the UI.

### 2. Database Schema & Tauri SQL Plugin

- Install `@tauri-apps/plugin-sql` and configure a local SQLite database named `snowflake_data.db`.
- Write the Rust backend initialization and migrations (`MigrationKind::Up`) in `src-tauri/src/lib.rs` (or `main.rs`) to create the following relational tables:
  1. `novels`: id, title, genre, target_audience, target_word_count, current_word_count, created_at.
  2. `steps_progress`: id, novel_id, step_number (1 to 10), content_text, is_completed.
  3. `characters`: id, novel_id, name, motivation, goal, conflict, epiphany, one_paragraph_summary, full_synopsis.
  4. `scenes`: id, novel_id, pov_character_id, setting, plot_thread, what_happens, expected_word_count, actual_word_count.

### 3. Application Layout & Routing

- Create a two-pane layout:
  - **Right Sidebar (Navigation):** Fixed width, containing the novel's title at the top, a progress bar (Completed Steps / 10), and a vertical list of the 10 Snowflake Steps.
  - **Left Main Workspace:** The active writing and dashboard area. 

### 4. The 10-Step Wizard (React Components)

Build a dynamic Workspace component that switches based on the selected step. Include the following logic:

- **Dashboard (Home):** Form to input Novel Title, Genre, and Target Word Count. Displays a progress bar comparing `current_word_count` to `target_word_count` (calculating the sum of actual word counts from scenes).
- **Step 1 (One-Sentence Summary):** Large text area. Maximum 50 words.
- **Step 2 (Paragraph Summary):** Text area. Must display Step 1's text above it in a read-only "Reference Block" styled distinctly (e.g., muted background).
- **Step 3 (Character Bios):** A CRUD interface to add characters. Forms for Name, Motivation, Goal, Conflict, Epiphany, and a paragraph summary.
- **Step 4 (Synopsis Expansion):** Expanding Step 2 into a full page. Displays Step 2 in the Reference Block.
- **Step 5 (Character Synopses):** Expanding Step 3 character bios into full pages.
- **Step 6 (Four-Page Synopsis):** Expanding Step 4. Displays Step 4 in the Reference Block.
- **Step 7 (Character Charts):** Deep dive CRUD form for character details.
- **Step 8 (Scene List Spreadsheet):** A tabular UI (Table) listing all scenes. Columns: Scene #, POV Character (Dropdown from characters table), Setting, Plot Thread, What Happens, and Expected Word Count.
- **Step 9 (Scene Narrative):** Writing a multi-paragraph description for each scene generated in Step 8.
- **Step 10 (First Draft / Export):** A final screen showing the accumulated structural data and a "Generate Export" button (simulate saving all data into a formatted markdown view on screen).

### 5. Writing Experience Features

- For all text areas, include a live **Word Counter** at the bottom corner of the input box.
- Arabic Typography: Apply a beautiful, standard Arabic web font via CSS (e.g., 'Tajawal', 'Cairo', or standard system Arabic fonts) with a high line-height (`leading-relaxed` or `leading-loose`) to ensure the cursive script is highly readable.

### 6. Backend Integration

- Expose all necessary Tauri IPC Commands in Rust (`#[tauri::command]`) to perform CRUD operations on Novels, Steps, Characters, and Scenes, ensuring the React frontend can save data on every keystroke (`onBlur` or debounced).

Please write the full codebase for this structure, generating all required files to make it a fully functional manual writing application.
