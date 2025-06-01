#!/usr/bin/env node

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";

// Define constants needed by other modules or this module globally
// Recreate __dirname for ES module scope as it's not available directly.
// import.meta.url gives the URL of the current module file.
const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);

// When running the compiled code from 'build/index.js', __dirname_esm will be 'restless_coder/build/'.
// The 'ui' directory is expected to be at 'restless_coder/ui/', so the relative path is '../ui/index.html'.
export const UI_FILE_PATH = path.join(__dirname_esm, '..', 'ui', 'index.html');

// Shared state for "listen" mode in process_voice_command
// Exported as objects to allow httpHandlers.ts to modify the .current property
export const resolveVoiceCommandPromise = { current: null as ((text: string) => void) | null };
export const rejectVoiceCommandPromise = { current: null as ((error: Error) => void) | null };

// SSE Clients - exported to be managed by httpHandlers
export let sseClients: http.ServerResponse[] = [];

// Import local modules that might depend on the above exports
import { handleRootOrIndex, handleSubmitTranscribedText, handleVoiceEvents, handleStaticFile, handleNotFound } from './httpHandlers.js';

// Helper function for SendCommandResponseMode
async function handleSendCommandResponseMode(
  args: { response_speech_text: string; response_display_text?: string },
  clients: http.ServerResponse[]
) {
  console.log(`[Tool Process] SendResponse mode. Speech: "${args.response_speech_text}", Display: "${args.response_display_text || args.response_speech_text}"`);
  if (clients.length === 0) {
    console.warn('[Tool Process] No UI clients connected via SSE to send response to.');
  }
  const payload = JSON.stringify({
    displayText: args.response_display_text || args.response_speech_text,
    speechText: args.response_speech_text,
  });
  clients.forEach(client => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch (e) {
      console.error('[SSE] Error writing to a client, it might have disconnected abruptly:', e);
    }
  });
  return {
    content: [{ type: "text", text: "Response sent to UI via SSE." }],
  };
}

// Helper function for ProcessAudioMode
async function handleProcessAudioMode(
  args: { audio_data: string; audio_input_type: string; speech_service_id: string; coding_assistant_id: string }
): Promise<string> {
  console.log(`[Tool Process] Process mode for coding_assistant_id: ${args.coding_assistant_id}`);
  if (args.speech_service_id === "webspeech") {
    console.log(`[Tool Process] Received pre-transcribed text (webspeech): "${args.audio_data}"`);
    return args.audio_data;
  }
  
  // Default path if not "webspeech"
  console.log(`[Tool Process] Transcribing audio using ${args.speech_service_id} from ${args.audio_input_type}...`);
  const transcribedText = `Placeholder: Server-side transcribed text for "${args.audio_data}"`; // Placeholder
  console.log(`[Tool Process] Transcribed text: "${transcribedText}"`);
  return transcribedText;
}

// Helper function for ListenMode (Restored refactored version)
async function handleListenMode(): Promise<string> {
  console.log('[Tool Process] Listen mode activated. Waiting for transcribed text...');
  if (resolveVoiceCommandPromise.current || rejectVoiceCommandPromise.current) {
    throw new McpError(ErrorCode.InvalidRequest, "Another listen operation is already in progress.");
  }

  let listenTimeoutId: any = null; // Using 'any' for broader compatibility (NodeJS.Timeout or number)

  return new Promise<string>((resolve, reject) => {
    const settle = (action: () => void) => {
      if (listenTimeoutId) {
        clearTimeout(listenTimeoutId);
        listenTimeoutId = null;
      }
      // Null out global references first to prevent re-entry or race conditions
      resolveVoiceCommandPromise.current = null;
      rejectVoiceCommandPromise.current = null;
      action(); // Perform the actual resolve or reject
    };

    resolveVoiceCommandPromise.current = (text: string) => settle(() => resolve(text));
    rejectVoiceCommandPromise.current = (error: Error) => settle(() => reject(error));

    listenTimeoutId = setTimeout(() => {
      // Check if the promise is still pending by looking at one of the global refs
      if (rejectVoiceCommandPromise.current) {
        console.warn('[Tool Process] Listen mode timed out after 60 seconds.');
        // Call the globally stored reject (which is the settle-wrapped version)
        rejectVoiceCommandPromise.current(new Error("Listen mode timed out after 60 seconds"));
      }
      // No need to explicitly null out here, as the settle function handles it.
    }, 60000);
  });
}

// Helper function to process transcribed text and formulate response to Cline
async function processTranscribedTextAndRespond(
  transcribedText: string,
  coding_assistant_id: string,
  output_format: string
) {
  console.log(`[Tool Process] Processing command for ${coding_assistant_id}: "${transcribedText}"`);
  let assistantResponse: string;

  if (coding_assistant_id === "cline") {
    assistantResponse = transcribedText;
  } else {
    assistantResponse = `Unknown coding assistant (${coding_assistant_id}). Received: "${transcribedText}"`;
  }
  console.log(`[Tool Process] Assistant response (to be returned to Cline): "${assistantResponse}"`);

  if (output_format === "audio") {
    return { content: [{ type: "text", text: "Placeholder: Synthesized audio response." }] };
  } else {
    return { content: [{ type: "text", text: assistantResponse }] };
  }
}

const server = new Server(
  {
    name: "restless_coder",
    version: "0.1.0",
    description: "MCP server for voice interaction with coding assistants"
  },
  {
    capabilities: {
      tools: {},
      // Resources and Prompts are not used in this version
    },
  }
);

// HTTP Server for UI
const HTTP_PORT = 6543;

const httpServer = http.createServer((req, res) => {
    const urlPath = req.url || '/';
    if (urlPath === '/' || urlPath === '/index.html') {
        handleRootOrIndex(req, res);
    } else if (urlPath === '/submit-transcribed-text' && req.method === 'POST') {
        handleSubmitTranscribedText(req, res);
    } else if (urlPath === '/voice-events') {
        handleVoiceEvents(req, res);
    } else if (urlPath.endsWith('.js') || urlPath.endsWith('.css')) { // Serve .js and .css files from /ui
        // Remove leading '/' from urlPath to make it relative for handleStaticFile
        handleStaticFile(req, res, urlPath.substring(1));
    }
    else {
        handleNotFound(req, res);
    }
});

httpServer.on('error', (err) => {
    console.error('[HTTP Server] Error:', err);
});
// End HTTP Server for UI

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "process_voice_command",
        description: "Processes a voice command by transcribing audio, interacting with a coding assistant, and optionally returning audio.",
        inputSchema: {
          type: "object",
          properties: {
            audio_input_type: {
              type: "string",
              enum: ["file_path", "base64_encoded"],
              description: "Specifies how the audio data is provided.",
            },
            audio_data: {
              type: "string",
              description: "The audio data itself, either a file path or base64 encoded string.",
            },
            speech_service_id: {
              type: "string",
              description: "Identifier for the speech recognition service to use (e.g., 'webspeech', 'whisper_local').",
            },
            coding_assistant_id: {
              type: "string",
              description: "Identifier for the coding assistant to use (e.g., 'cline', 'github_copilot').",
            },
            output_format: {
              type: "string",
              enum: ["text", "audio"],
              default: "text",
              description: "Desired output format (transcribed text or synthesized audio response).",
            },
            response_display_text: {
              type: "string",
              description: "Optional. Text for Cline's response to be displayed in the UI.",
            },
            response_speech_text: {
              type: "string",
              description: "Optional. Concise text for Cline's response to be spoken by the UI.",
            },
          },
          required: [ // Only coding_assistant_id is strictly required at schema level for all modes.
            "coding_assistant_id",
          ],
        },
      },
      {
        name: "get_voice_interaction_protocol",
        description: "Retrieves the content of the voice interaction protocol document.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
        outputSchema: {
          type: "object",
          properties: {
            protocol_content: {
              type: "string",
              description: "The content of the voice interaction protocol document."
            }
          },
          required: ["protocol_content"],
          additionalProperties: false
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "process_voice_command") {
    const args = request.params.arguments;

    // Argument validation
    if (!args || typeof args !== "object" || !args.coding_assistant_id) {
      throw new McpError(ErrorCode.InvalidParams, "Missing required argument: coding_assistant_id");
    }

    // Type assertion for arguments
    const toolArgs = args as {
      audio_input_type?: string;
      audio_data?: string;
      speech_service_id?: string;
      coding_assistant_id: string;
      output_format?: string;
      response_display_text?: string;
      response_speech_text?: string;
    };

    try {
      // Mode 1: Send response to UI via SSE
      if (toolArgs.response_speech_text) {
        return await handleSendCommandResponseMode(
          { response_speech_text: toolArgs.response_speech_text, response_display_text: toolArgs.response_display_text },
          sseClients
        );
      }
      
      // Modes 2 & 3: Process or Listen for voice command
      let transcribedText: string;

      if (toolArgs.audio_data && toolArgs.audio_input_type && toolArgs.speech_service_id) {
        // Process mode
        transcribedText = await handleProcessAudioMode({
          audio_data: toolArgs.audio_data,
          audio_input_type: toolArgs.audio_input_type,
          speech_service_id: toolArgs.speech_service_id,
          coding_assistant_id: toolArgs.coding_assistant_id,
        });
      } else if (!toolArgs.audio_data && toolArgs.coding_assistant_id === "cline") {
        // Listen mode
        transcribedText = await handleListenMode();
      } else {
        throw new McpError(ErrorCode.InvalidParams, "Invalid arguments: Must be 'send response', 'listen', or 'process audio' mode.");
      }

      // Process transcribed text (common for listen/process modes)
      return await processTranscribedTextAndRespond(
        transcribedText,
        toolArgs.coding_assistant_id,
        toolArgs.output_format || "text"
      );

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("[Server CallToolRequestSchema - process_voice_command] Error processing voice command:", errorMessage, errorStack);
      if (rejectVoiceCommandPromise.current) {
          console.error("[Server CallToolRequestSchema - process_voice_command] Rejecting active listener due to error.");
          rejectVoiceCommandPromise.current(error instanceof Error ? error : new Error(String(error)));
          resolveVoiceCommandPromise.current = null;
          rejectVoiceCommandPromise.current = null;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Error processing voice command: ${errorMessage}`
      );
    }
  } else if (request.params.name === "get_voice_interaction_protocol") {
    try {
      const protocolFileName = 'voice_interaction_protocol.md';
      const protocolPath = path.join(__dirname_esm, '..', '.clinerules', protocolFileName);

      if (!fs.existsSync(protocolPath)) {
          console.error(`[Tool get_voice_interaction_protocol] Protocol file not found at: ${protocolPath}`);
          throw new McpError(ErrorCode.InternalError, `Protocol file not found: ${protocolFileName}. Expected at ${protocolPath}`);
      }

      const protocolContent = fs.readFileSync(protocolPath, 'utf-8');
      console.log(`[Tool get_voice_interaction_protocol] Successfully read protocol file from ${protocolPath}.`);
      return {
        content: [{ type: "json", data: { protocol_content: protocolContent } }]
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("[Tool get_voice_interaction_protocol] Error:", errorMessage, errorStack);
      if (error instanceof McpError) throw error;
      throw new McpError(ErrorCode.InternalError, `Error reading protocol file: ${errorMessage}`);
    }
  } else {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${request.params.name}`
    );
  }
});

// Error handling
server.onerror = (error) => console.error('[MCP Error]', error);

// Graceful shutdown
async function gracefulShutdown() {
  console.error("[Lifecycle] Shutting down servers...");
  let mcpClosed = false;
  let httpClosed = false;

  const tryExit = () => {
    // Exit only if both servers have attempted to close.
    if (mcpClosed && httpClosed) {
      console.error("[Lifecycle] Both servers processed for shutdown. Exiting.");
      process.exit(0);
    }
  };

  // MCP Server Shutdown
  server.close()
    .then(() => {
      console.error("[MCP Server] Closed.");
    })
    .catch(err => {
      console.error("[MCP Server] Error during close:", err);
    })
    .finally(() => {
      mcpClosed = true;
      tryExit();
    });

  // HTTP Server Shutdown
  httpServer.close((err) => {
    if (err) {
      console.error("[HTTP Server] Error during close:", err);
    } else {
      console.error("[HTTP Server] Closed.");
    }
    httpClosed = true;
    tryExit();
  });

  // Timeout to force exit if graceful shutdown hangs
  setTimeout(() => {
    console.error("[Lifecycle] Graceful shutdown timed out. Forcing exit.");
    process.exit(1); // Exit with error code
  }, 5000); // 5 seconds timeout
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Helper function to start HTTP server and await listening
function startHttpServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Listen for 'error' events specifically during the startup phase
    const startupErrorListener = (err: Error) => {
      // Prevent future calls to reject if 'error' is emitted multiple times quickly
      httpServer.removeListener('error', startupErrorListener); 
      reject(err);
    };
    httpServer.once('error', startupErrorListener);

    httpServer.listen(port, () => {
      httpServer.removeListener('error', startupErrorListener); // Clean up: only listen for startup errors once
      console.error(`[HTTP Server] UI available at http://localhost:${port}`);
      resolve();
    });
  });
}

async function main() {
  try {
    await startHttpServer(HTTP_PORT);
  } catch (err) {
    console.error("[HTTP Server] Failed to start. This service may be critical for UI interaction. Error details:", err);
    // If HTTP server is critical and fails to start, exit the process.
    process.exit(1); 
  }

  // Start MCP server
  const transport = new StdioServerTransport();
  try {
    await server.connect(transport);
    console.error("[MCP Server] Restless Coder MCP server running on stdio");
  } catch (mcpError) {
    console.error("[MCP Server] Failed to connect transport. This is critical for MCP functionality. Error details:", mcpError);
    // If MCP server fails to connect, we should also exit.
    // Ensure HTTP server is closed before exiting if it started.
    httpServer.close(() => {
      console.error("[HTTP Server] Closed due to MCP server connection failure.");
      process.exit(1);
    });
    // Add a timeout in case httpServer.close() hangs
    setTimeout(() => {
        console.error("[HTTP Server] Close timed out after MCP failure. Forcing exit.");
        process.exit(1);
    }, 3000); // 3 seconds
  }
}

main().catch((error: unknown) => {
  // This catch block handles errors from the main promise chain itself (e.g., if an await fails synchronously)
  // or if startHttpServer / server.connect rethrow errors not caught by their specific try/catch.
  console.error("[Startup] Unhandled error during server startup:", error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack : undefined);
  // Attempt to close http server if it might be running
  try {
    httpServer.close(() => {
        process.exit(1);
    });
    setTimeout(() => process.exit(1), 1500); // Force exit if close hangs
  } catch (e) {
    process.exit(1); // If closing fails, still exit
  }
});
