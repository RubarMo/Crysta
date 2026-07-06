<p align="center">
  <img src="src-tauri/icons/icon.png" alt="Snowflake Arabic Logo" width="128" height="128" />
</p>

# Snowflake Arabic ❄️✍️

**Snowflake Arabic** is a sleek, professional, and lightweight desktop application designed for writers and novelists to outline, structure, and write their stories using the famous **Snowflake Method (طريقة سنوفليك)**. 

Built on top of **Tauri v2**, **React**, **TypeScript**, and **Rust**, this application provides a native desktop environment that is fast, secure, and fully offline-first.

---

## 🚀 Key Features

* 📁 **File-Based Project Database (.snowflake):** Each novel is saved as its own self-contained database file. Save your projects anywhere (Local Drive, USB, or cloud-sync folders like OneDrive) and move them easily.
* 🛠️ **10-Step Snowflake Guidance:** Complete walkthrough of the Snowflake Method step-by-step—from a single-sentence summary to character sheets, scene listings, and your final first draft.
* 📊 **Project Dashboard:** Track overall statistics across all your projects, check word counts vs goals, and manage your recent files history directly from the landing page.
* 🌓 **Responsive Dual Theme:** Easily toggle between Dark and Light mode to suit your environment.
* 📝 **Built-in Tools:** Integrated word counter, Character sheet manager (defining motivations, goals, conflicts, and epiphanies), and Scene lists (setting point-of-view, setting, plot thread, and counts).
* 💾 **Native OS Dialogs:** Native Windows File Picker and Saver interfaces for a seamless native desktop user experience.

---

## 🛠️ Technology Stack

* **Frontend:** React 18, TypeScript, TailwindCSS / Custom HSL CSS variables for animations & micro-transitions, Lucide Icons.
* **Backend wrapper:** Rust, Tauri v2.
* **Database:** SQLite (embedded via `rusqlite` on Rust, avoiding client-side database bloat).
* **Native Dialogs:** `rfd` (Rust File Dialogs).

---

## 📦 Getting Started

### Prerequisites

Make sure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v20+ recommended)
* [Rust toolchain](https://www.rust-lang.org/tools/install)
* [C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (for Windows compilation)

### Development

1. Clone the repository:
   ```bash
   git clone https://github.com/RubarMo/snowflake-arabic.git
   cd snowflake-arabic
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server and desktop preview:
   ```bash
   npm run tauri dev
   ```

### Production Build

To compile the optimized production executable and package them into installers (`.msi` and `.exe` setups):
```bash
npm run tauri build
```
The compiled bundles will be generated under `src-tauri/target/release/bundle/`.

---

## ❄️ What is the Snowflake Method?

Developed by award-winning author Randy Ingermanson, the Snowflake Method is a top-down design process for writing novels:
1. **One-Sentence Summary:** Summarize the whole story in less than 15 words.
2. **One-Paragraph Summary:** Expand to a 5-sentence paragraph detailing the setup, 3 major disasters, and the resolution.
3. **Character Bios:** Define motivations, goals, and epiphanies.
4. **One-Page Synopsis:** Expand each sentence of the paragraph into a full page.
5. **Character Narratives:** Write 1-page descriptions from each major character's POV.
6. **Four-Page Synopsis:** Expand the summary into a comprehensive detailed overview.
7. **Detailed Character Sheets:** Deepen descriptions, habits, and details.
8. **Scene List:** Map out all scenes into a spreadsheet/list.
9. **Scene Outlines:** Narrative description of what happens in each scene.
10. **First Draft:** Write!

---

## 👤 Developer

Built with ❤️ by **[Rubar](https://github.com/RubarMo)**. Feel free to open issues, submit pull requests, or reach out for collaboration!

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
