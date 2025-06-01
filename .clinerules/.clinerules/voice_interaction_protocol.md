# Cline Voice Interaction Protocol

## 1. Objective

This document defines a protocol for enabling Cline to process user voice commands by interacting with the `restless_coder` MCP server's `process_voice_command` tool. The goal is to allow Cline to act as the primary agent, receiving voice-derived instructions and executing them, potentially obviating the need for a separate VS Code extension to bridge voice input directly to Cline's chat interface for this specific workflow.

## 2. Roles & Responsibilities

### 2.1. User
*   Initiates voice commands.
*   Ensures Cline's auto-approval mechanisms are enabled for any actions Cline is expected to take without explicit step-by-step confirmation during this voice-driven workflow. This is critical for a seamless experience.
*   Activates this protocol by instructing Cline to adhere to it.

### 2.2. Cline (The AI Assistant)
*   When this protocol is active, Cline operates based on the instructions herein.
*   Receives or is directed to the (transcribed) voice command.
*   Is responsible for invoking the `process_voice_command` MCP tool with the appropriate parameters.
*   Treats the output from `process_voice_command` (when `coding_assistant_id` was set to `"cline"`) as a direct instruction or task to be performed.
*   Executes the task using its standard capabilities and tools.
*   After executing a task (and any approval steps), Cline formulates a single response suitable for both speech and display.
*   Cline then calls `process_voice_command` with the `response_speech_text` parameter (and can omit `response_display_text` as the server will use `response_speech_text` for both) to send this response to the UI.
*   Finally, Cline re-invokes `process_voice_command` in 'listen' mode to await the next command.
*   If a command requires explicit approval and auto-approval is not configured, Cline will state the need for approval (sending this statement via the response mechanism above) and then re-invoke `process_voice_command` in 'listen' mode to await a confirmatory voice command (e.g., "yes, proceed", "confirm").

### 2.3. `process_voice_command` MCP Tool (from `restless_coder` server)
*   **Input:**
    *   **Process Mode:** Accepts `audio_input_type`, `audio_data`, `speech_service_id`, `coding_assistant_id`, and `output_format`. This mode is for direct processing of provided audio/text.
    *   **Listen Mode:** If `coding_assistant_id` is `"cline"` and `audio_data` (along with `audio_input_type`, `speech_service_id`, `response_speech_text`, etc.) is omitted, the tool enters a "listen" state. It waits for transcribed text to be submitted and then returns this text to Cline.
    *   **Send Response Mode:** If `response_speech_text` (and optionally `response_display_text`) are provided, the tool sends this payload to connected UI clients (e.g., via Server-Sent Events).
*   **Processing (Listen Mode):**
    1.  When invoked in listen mode, the tool waits internally for a voice command to be transcribed and submitted by an external client (like `ui/index.html`).
    2.  Upon receiving the transcribed text, it passes this text back as its result to Cline.
*   **Processing (Send Response Mode):**
    1.  When invoked with `response_speech_text`, the tool transmits the provided `response_speech_text` and `response_display_text` (if any) to all connected UI clients.
    2.  It then returns a confirmation message to Cline.
*   **Processing (Process Mode):**
    1.  If audio is provided, transcribes it using the specified `speech_service_id` (unless `speech_service_id` indicates pre-transcribed text like `"webspeech"`).
    2.  If `coding_assistant_id` is `"cline"`, the tool's primary responsibility is to return the (transcribed) command as a clear, actionable directive for Cline.
    3.  It does **not** attempt to directly execute the command itself but prepares the command for Cline to execute.
*   **Output:** Returns a textual representation of the user's command, intended to be directly processed by Cline as its next task.

## 3. Interaction Flow

1.  **Activation:** The user instructs Cline to operate according to this `voice_interaction_protocol.md`.
2.  **Cline Initiates Listening:** Cline invokes the `process_voice_command` tool in "listen" mode (with `coding_assistant_id: "cline"` and no `audio_data`). The tool now waits.
3.  **Voice Input & Transcription:** The user opens the voice client UI (e.g., `http://localhost:6543`) and provides a voice command. The UI transcribes it.
4.  **Text Submission to Server:** The UI client sends the transcribed text to a dedicated HTTP endpoint on the `restless_coder` server (e.g., `/submit-transcribed-text`).
5.  **Tool Returns Directive to Cline:** The `process_voice_command` tool (which was waiting) receives the text from the HTTP endpoint and returns it to Cline.
    *   *Example output from tool:* "Create a new file named `example.txt` with the content 'hello world'."
6.  **Cline Analyzes Task:** Cline receives the directive.
    *   **6a. Approval Check:** If the task requires approval (and auto-approve is not set), Cline announces this (e.g., "Executing 'delete important_file.txt' requires approval.") and then proceeds to Step 2 (re-initiates listening) to await a confirmation command (e.g., "Yes, confirm delete"). If confirmation is received, Cline proceeds with the original task.
7.  **Cline Executes Task:** Cline executes the (approved) task using its available tools.
8.  **Cline Sends Response to UI:** Cline formulates a single response suitable for both speech and display. It then invokes `process_voice_command` with this response as the `response_speech_text` argument (and `coding_assistant_id: "cline"`). The `response_display_text` argument can be omitted. The tool relays this to the UI via SSE, where it's displayed and spoken.
9.  **Loop to Listen:** After sending its response, Cline automatically returns to Step 2 (initiates listening) to await the next command. This creates a continuous voice command loop.
10. **User Experience:** The user hears Cline's spoken response and sees the same text displayed in the UI.

## 4. Custom Instruction Set for Cline

*   **Adherence:** "When instructed to follow the `voice_interaction_protocol.md`, you will strictly adhere to the roles and flows defined herein."
*   **Tool Invocation (Listen Mode):** "To listen for a new voice command, you will call the `restless_coder/process_voice_command` MCP tool with `coding_assistant_id: \"cline\"` and omit `audio_data`, `audio_input_type`, `speech_service_id`, `response_display_text`, and `response_speech_text` arguments. This activates its 'listen' mode."
*   **Response Formulation and Delivery:** "After processing a command (and before re-entering listen mode), you will formulate a single response suitable for both speech and display. You will then call `process_voice_command` with `coding_assistant_id: \"cline\"` and `response_speech_text: \"<your_response>\"`. The `response_display_text` argument can be omitted, as the server will use the `response_speech_text` for both. This will send your response to the user's voice interface."
*   **Continuous Loop:** "After sending your response to the UI, you will immediately re-initiate listening for the next command by invoking `process_voice_command` in listen mode as described above."
*   **Action on Output (from Listen Mode):** "The textual output received from `process_voice_command` (when it was in listen mode) is to be treated as a direct, high-priority instruction from the user. You will then proceed to analyze and execute this instruction."
*   **Approval Handling:** "If an action derived from a voice command requires user approval (and auto-approval is not configured), you will formulate a single response stating this requirement, suitable for both speech and display. You will send this response to the UI using the `process_voice_command` tool's response delivery mode. After that, you will re-enter listening mode. You should treat the subsequent voice command as potentially being the user's approval (e.g., 'confirm', 'yes') or disapproval for that action. If confirmed, execute the action, then formulate and send a confirmation response, then re-enter listening mode. If disapproved, formulate and send an acknowledgement, then re-enter listening mode."
*   **Auto-Approval Assumption:** "You will operate under the assumption that the user may have configured necessary auto-approvals. If auto-approval is active for an action, the explicit voice confirmation step for that action can be bypassed."
*   **Error Handling:** "If `process_voice_command` returns an error, or if you encounter an error executing the subsequent task, report this clearly. After reporting an error that doesn't break the loop, attempt to re-enter listening mode."

## 5. Prerequisites

*   The `restless_coder` MCP server must be running and accessible to Cline.
*   The `process_voice_command` tool within `restless_coder` has been implemented to:
    *   Correctly handle the `coding_assistant_id: "cline"` case, returning the user's command intent as a textual directive when in listen mode.
    *   Support a "listen" mode (activated by omitting `audio_data` and other specific parameters when `coding_assistant_id` is `"cline"`) where it waits for transcribed text from an external source (like the UI client via an HTTP endpoint) and returns it to Cline.
    *   Support a "send response" mode, activated by providing `response_speech_text` (and optionally `response_display_text`), to send data to the UI via Server-Sent Events (SSE).
*   The voice client UI (e.g., `restless_coder/ui/index.html`) must be:
    *   Configured to send transcribed text to the `restless_coder` server's designated HTTP endpoint when the tool is in listen mode.
    *   Equipped with an SSE client to receive messages from the server's `/voice-events` endpoint.
    *   Capable of performing text-to-speech (TTS) using browser APIs, using the `speechText` from received SSE messages.
    *   Able to display `displayText` from received SSE messages.
    *   Provide a UI element (e.g., dropdown) for voice selection for TTS.
*   The user should ideally configure Cline's auto-approval settings for common, safe tasks to streamline the voice workflow. For actions requiring approval without global auto-approve, the voice confirmation flow will be used.

## 6. Activation Example

User: "Cline, I want to use voice commands. Please follow the protocol defined in `restless_coder/.clinerules/voice_interaction_protocol.md` for handling them."

*(Cline will then initiate the first call to `process_voice_command` in listen mode.)*

*(The old example of user providing transcribed text directly to Cline in chat is no longer the primary flow for listen mode; Cline now actively listens via the tool.)*
