# Restless Coder MCP Server

NOTE: THIS IS PRE-RELEASE; STILL IMPLEMENTING CORE FUNCTIONS AS OF 6/1/2025


**MCP server for voice interaction with coding assistants.**

This server provides a tool (`process_voice_command`) that enables users to interact with various coding assistants using voice commands. It aims to make the development workflow more natural by allowing voice input for commands and potentially voice-based approval for code changes or actions.

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

To use this MCP server, you need to add its configuration to your MCP client's settings file.

For example, in VS Code with the Cline extension, the file is typically located at:
-   Windows: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
-   macOS: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
-   Linux: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

Add the following entry to the `mcpServers` object in the settings file, adjusting the path to `index.js` as necessary:

```json
{
  "mcpServers": {
    // ... other servers
    "restless_coder": {
      "command": "node",
      "args": ["/full/path/to/restless_coder/restless_coder/build/index.js"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
    // ... other servers
  }
}
```
Replace `/full/path/to/` with the actual absolute path to the `restless_coder/restless_coder/build/index.js` file on your system.

### Debugging

MCP servers communicate over stdio. For easier debugging, you can use the MCP Inspector:
```bash
npm run inspector
```
This will provide a URL to access debugging tools in your browser.
