<p align="center">
  <img src="src-tauri/icons/icon.png" alt="Crysta Logo" width="128" height="128" />
</p>

# Crysta

Crysta is a local-first desktop and mobile application designed to guide novelists through structuring their stories using the Snowflake Method. It provides an offline-first writing workspace with built-in step tracking, character management, and scene outlines.

Built using **Tauri v2**, **React**, **TypeScript**, and **Rust (SQLite)**, Crysta compiles native binaries across desktop and mobile platforms.

---

## 💻 Platforms & Compilation Targets

Crysta compiles native bundles for the following environments:
*   **Desktop:** Windows (MSI, NSIS installer), macOS (DMG, App bundle), Linux (DEB, RPM, AppImage).
*   **Mobile:** Android (unaligned release APK, Google Play AAB bundle).

---

## 📥 Installation

You can download pre-compiled packages directly from the [Releases](https://github.com/RubarMo/Crysta/releases) section, or build the binaries yourself.

### Pre-compiled Releases

Choose the binary that matches your operating system:
*   **Windows:** Download the `.msi` or `.exe` installer.
*   **macOS:** Download the `.dmg` or `.app.tar.gz` package.
*   **Linux:** Download the `.deb`, `.rpm`, or `.AppImage` package.
*   **Android:** Download the `.apk` package.

---

### ⚠️ OS Security Warnings (Unsigned Binaries)

Because Crysta is a local-first, open-source utility, the compiled binaries are not signed with paid commercial developer certificates (such as Microsoft Authenticode or Apple Developer ID). Depending on your OS, you may see a warning when installing:

#### Windows (SmartScreen)
1. Double-click the installer.
2. On the blue "Windows protected your PC" pop-up, click **More info**.
3. Click **Run anyway** to launch the installer.

#### macOS (Gatekeeper)
1. Mount the `.dmg` (or extract the `.app.tar.gz` archive) and drag Crysta to your Applications folder.
2. Double-click the app. If blocked by Gatekeeper, click **OK**.
3. Right-click (or `Control`-click) the Crysta app icon and select **Open**.
4. Click **Open** on the confirmation dialog. This permanently saves a security exception for the app.

#### Linux
1. Right-click the `.AppImage` file and open **Properties**.
2. Go to the **Permissions** tab and check **Allow executing file as program**.
3. Alternatively, run `chmod +x <filename>` in your terminal, then run the package.

#### Android
1. Download the **signed debug APK** (`app-universal-debug.apk`) directly to your phone.
2. Open the APK. If prompted by your browser or files app, toggle **Allow installation from this source**.
3. If blocked by Play Protect, tap **Install anyway**.

---

## 🛠️ Architecture & Core Features

*   **Local-First Database (`.crysta`):** Projects are saved as standalone SQLite databases containing the entire writing draft, progress markers, characters, and scene metadata. Files can be copied, moved, or backed up manually or via cloud services (e.g., OneDrive, iCloud).
*   **Fully Offline:** No accounts, remote servers, or internet connection required. All database queries execute locally through native JNI/FFI bindings to SQLite.
*   **Bilingual Directionality:** Dynamic layout orientation (RTL for Arabic, LTR for English) toggled instantly inside the application.
*   **10-Step Snowflake Walkthrough:** Interactive writing templates mapped directly onto the classical Snowflake outlining method.
*   **Outlining Tools:** Included word counters, character bio planners (motivations, goals, conflicts, epiphanies), and detailed scene outline sheets (POV mapping, settings, word metrics).
*   **Native System Access:** Relies on desktop file dialogs (`rfd` crate) and implements custom directory resolvers on mobile targets to interact with local app sandboxes.

---

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v20+ recommended)
*   **Rust Toolchain** (latest stable release)
*   *For Windows compilation:* Visual Studio C++ Build Tools
*   *For Android compilation:* Java JDK (17 or 21) and Android SDK/NDK tools

### Development Build

1. Clone and navigate to the project directory:
   ```bash
   git clone https://github.com/RubarMo/Crysta.git
   cd Crysta
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   *   **Desktop Preview:**
       ```bash
       npm run tauri dev
       ```
   *   **Android Mobile Live Preview:** (with a physical device or emulator running)
       ```bash
       npx tauri android dev
       ```

### Production Build

*   **Compile Desktop Installers:**
    ```bash
    npm run tauri build
    ```
*   **Compile Android APK & AAB:**
    ```bash
    npx tauri android build
    ```

Production outputs are located in:
*   *Desktop:* `src-tauri/target/release/bundle/`
*   *Android:* `src-tauri/gen/android/app/build/outputs/`

---

## 📖 The Snowflake Method Overview

The application follows the 10-step story design sequence developed by Randy Ingermanson:

1.  **One-Sentence Summary:** Draft a 15-word story hook.
2.  **One-Paragraph Summary:** Expand to a five-sentence narrative shape (setup, three disasters, resolution).
3.  **Character Bios:** Plan core character characteristics, motivations, and epiphanies.
4.  **One-Page Synopsis:** Develop each sentence of your one-paragraph summary into a full page.
5.  **Character POV Synopses:** Describe the story arc from the perspective of each major character.
6.  **Four-Page Synopsis:** Expand the outline to a comprehensive plot structure.
7.  **Character Profile Sheets:** Complete detailed profiles, physical appearance, and growth charts.
8.  **Scene List:** Map the synopsis into an ordered sequence of scenes.
9.  **Scene Outlines:** Narrative description of the action occurring in each scene.
10. **First Draft:** Author the final novel draft.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
