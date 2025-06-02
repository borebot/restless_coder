# Restless Coder MCP Server

NOTE: THIS IS PRE-RELEASE; CORE VOICE PROTOCOL FUNCTIONAL AS OF 6/2/2025


**MCP server for voice interaction with coding assistants. Currently built for use with Cline, but may extend later.**

This server provides a tool (`process_voice_command`) that enables users to interact with Cline using voice commands. It aims to make the development workflow more natural by allowing voice input for commands and potentially voice-based approval for code changes or actions.

Note: for use with Cline, you need to set your auto-approve rules to encompass every command you expect to activate by voice. You can keep your auto-approve limited if you don't mind physically clicking approve. I would recommend allowing auto-approval of restless_coder actions, however, as the interaction loop will automatically call restless_coder after every action, until the user tells it to stop the tool/protocol.

## Features

### Tools

-   **`process_voice_command`**:
    -   Accepts audio input (either as a file path or base64 encoded string).
    -   Transcribes the audio using a specified speech recognition service (pluggable).
    -   Sends the transcribed command to a specified coding assistant (pluggable).
    -   Returns the assistant's response, either as text or synthesized audio.
    -   **Input Schema:**
        -   `audio_input_type` (string, enum: `"file_path"`, `"base64_encoded"`): How audio data is provided.
        -   `audio_data` (string): The audio data.
        -   `speech_service_id` (string): Identifier for the speech recognition service (e.g., `"webspeech"`, `"whisper_local"`).
        -   `coding_assistant_id` (string): Identifier for the coding assistant (e.g., `"cline"`, `"github_copilot"`).
        -   `output_format` (string, enum: `"text"`, `"audio"`, default: `"text"`): Desired output format.

## Development

Prerequisites:
- Node.js and npm

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild on file changes:
```bash
npm run watch
```

## Installation

Follow these step-by-step instructions to install the Restless Coder MCP server and integrate it with Cline in VS Code.

**Step 1: Prerequisites - Node.js and npm**

This server requires Node.js and npm (Node Package Manager). npm usually comes with Node.js.
1.  **Check if Node.js and npm are installed:**
    Open your terminal (Command Prompt, PowerShell, Terminal, or Git Bash) and type:
    ```bash
    node -v
    npm -v
    ```
    If these commands show version numbers (e.g., `v18.12.1` and `8.19.2`), you're good to go.
2.  **Install Node.js and npm if missing:**
    If you don't have them, download Node.js from [nodejs.org](https://nodejs.org/) (we recommend the LTS version). Installing Node.js will also install npm.

**Step 2: Get the Restless Coder Server Code**

You need to download the server's code to your computer.
*   **Option A: Using Git (Recommended if you know Git)**
    1.  Open your terminal.
    2.  Navigate to the directory where you want to store the project (e.g., `cd Documents/Projects`).
    3.  Clone the repository (replace `your-username/restless_coder.git` with the actual URL if different):
        ```bash
        git clone https://github.com/your-username/restless_coder.git
        ```
*   **Option B: Downloading a ZIP File**
    1.  Go to the GitHub page for Restless Coder (e.g., `https://github.com/your-username/restless_coder`).
    2.  Click the green "Code" button.
    3.  Select "Download ZIP".
    4.  Save the ZIP file to your computer and then extract it to a folder (e.g., in `Documents/Projects`). You'll have a folder named something like `restless_coder-main`. You can rename it to `restless_coder` for simplicity.

**Step 3: Navigate to the Project Directory**

1.  In your terminal, change to the directory where you cloned or extracted Restless Coder:
    ```bash
    cd path/to/restless_coder 
    ```
    (e.g., `cd Documents/Projects/restless_coder`)

**Step 4: Install Dependencies**

The server has some software "dependencies" it needs to run.
1.  While inside the `restless_coder` directory in your terminal, run:
    ```bash
    npm install
    ```
    This command reads the `package.json` file and downloads the necessary packages into a `node_modules` folder.

**Step 5: Build the Server**

The server code is written in TypeScript and needs to be "built" (compiled) into JavaScript.
1.  In the same terminal, still inside the `restless_coder` directory, run:
    ```bash
    npm run build
    ```
    This command will create a `build` folder inside `restless_coder`, and inside `build`, you'll find an `index.js` file. This `build/index.js` is the main file Cline will run.

**Step 6: Find the Absolute Path to `build/index.js`**

Cline needs the full, complete "absolute" path to the `build/index.js` file.
1.  Make sure you are still in the `restless_coder` directory in your terminal.
2.  **For macOS or Linux:**
    Type `pwd` in your terminal. It will print the current directory's full path (e.g., `/Users/yourname/Documents/Projects/restless_coder`).
    Your absolute path to `index.js` will be this path + `/build/index.js`.
    Example: `/Users/yourname/Documents/Projects/restless_coder/build/index.js`
3.  **For Windows:**
    *   **Using Command Prompt or PowerShell:**
        Type `cd` (in Command Prompt) or `Get-Location` (in PowerShell). This shows the current path.
        Your absolute path will be this path + `\build\index.js`.
        Example: `C:\Users\yourname\Documents\Projects\restless_coder\build\index.js`
    *   **Using Git Bash (if installed):**
        Type `pwd`. It will print a path like `/c/Users/yourname/Documents/Projects/restless_coder`.
        Your absolute path will be this path + `/build/index.js`.
        Example: `/c/Users/yourname/Documents/Projects/restless_coder/build/index.js`
    *   **Using File Explorer:**
        Navigate to the `restless_coder` folder, then into the `build` folder. Right-click on `index.js` and look for an option like "Copy as path" or check its Properties for the "Location".

    **Important for Windows paths in JSON:** When you use this path in the JSON settings file (next step), you must either replace single backslashes `\` with double backslashes `\\` (e.g., `C:\\Users\\yourname\\...`) or use forward slashes `/` (e.g., `C:/Users/yourname/...`).

**Step 7: Configure Cline to Use the Server**

Now, you'll tell Cline where to find and how to run your Restless Coder server.
1.  **Locate Cline's MCP settings file (`cline_mcp_settings.json`):**
    This file is usually found in these locations:
    *   **Windows:** `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
        (You can paste `%APPDATA%` into your File Explorer address bar to go to the Roaming AppData folder).
    *   **macOS:** `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
        (In Finder, click "Go" in the menu bar, hold Option, then click "Library". Then navigate to Application Support -> Code -> ...).
    *   **Linux:** `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
        (Hidden files might need to be shown in your file manager).
2.  **Open `cline_mcp_settings.json` in a text editor** (like VS Code itself).
    It's a JSON file. Be careful with syntax (commas, curly braces, square brackets).
3.  **Add the Restless Coder server configuration:**
    Look for an `mcpServers` object. If it doesn't exist, you might need to create it (see Cline documentation if unsure). Inside `mcpServers`, add an entry for `restless_coder`:

    ```json
    {
      // ... other settings if they exist ...
      "mcpServers": {
        // ... other servers if they exist, make sure there's a comma after the previous one ...
        "restless_coder": {
          "command": "node",
          "args": ["YOUR_ABSOLUTE_PATH_TO_BUILD_INDEX_JS_HERE"],
          "env": {},
          "disabled": false,
          "autoApprove": []
        }
        // ... if this is the last server, no comma after this closing brace ...
      }
      // ... other settings if they exist ...
    }
    ```
    **CRITICAL:** Replace `"YOUR_ABSOLUTE_PATH_TO_BUILD_INDEX_JS_HERE"` with the actual absolute path you found in Step 6.
    *   Example for macOS/Linux: `"args": ["/Users/yourname/Documents/Projects/restless_coder/build/index.js"]`
    *   Example for Windows (using double backslashes): `"args": ["C:\\Users\\yourname\\Documents\\Projects\\restless_coder\\build\\index.js"]`
    *   Example for Windows (using forward slashes): `"args": ["C:/Users/yourname/Documents/Projects/restless_coder/build/index.js"]`

    Ensure your JSON is valid. If you add this entry and there were other servers before it, make sure the previous server entry ends with a comma. If this is the only server, or the last one, its closing `}` should not have a comma after it.

**Step 8: Restart VS Code or Reload Cline**

For Cline to pick up the new server configuration, you might need to:
*   Restart VS Code completely.
*   Or, use a command in VS Code to reload Cline or its MCP servers if available (check Cline's documentation).

**Step 9: Verify Installation (Optional)**

1.  After restarting, open Cline.
2.  Try asking Cline if it has access to an MCP server named `restless_coder` or a tool named `process_voice_command`.
3.  If configured correctly, Cline should be able to find and use the server. The server itself will start running in the background when Cline tries to use it. You can check your system's process list for a `node` process running the `index.js` script.

You should now be able to use the Restless Coder server with Cline! The server provides a UI for voice input at `http://localhost:6543` (or `http://YOUR_COMPUTER_IP:6543` from other devices on your local network, once the server is started by Cline attempting to use it).

### Debugging

MCP servers communicate over stdio. For easier debugging, you can use the MCP Inspector:
```bash
npm run inspector
```
This will provide a URL to access debugging tools in your browser.
