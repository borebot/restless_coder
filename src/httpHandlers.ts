import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path'; // Import path
import { UI_FILE_PATH, sseClients, resolveVoiceCommandPromise, rejectVoiceCommandPromise } from './index.js';

// Lazy initialize UI_BASE_DIR to avoid TDZ issues with UI_FILE_PATH from index.js
let _uiBaseDir: string | null = null;
function getUiBaseDir(): string {
    if (!_uiBaseDir) {
        if (!UI_FILE_PATH) {
            // This case should ideally not happen if index.js initializes UI_FILE_PATH correctly before any HTTP request.
            // However, adding a safeguard or throwing a more specific error can be useful.
            console.error("CRITICAL: UI_FILE_PATH is not initialized when getUiBaseDir is called for the first time.");
            // Fallback or throw, depending on desired robustness. For now, let it potentially fail if UI_FILE_PATH is truly undefined.
        }
        _uiBaseDir = path.dirname(UI_FILE_PATH);
    }
    return _uiBaseDir;
}

export function handleRootOrIndex(req: http.IncomingMessage, res: http.ServerResponse): void {
    fs.readFile(UI_FILE_PATH, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            const errorMessage = err.code === 'ENOENT'
                ? `Error: File not found at ${UI_FILE_PATH}. Please ensure 'ui/index.html' exists, and is correctly placed relative to the 'build' directory (expected: '../ui/index.html' from 'build').`
                : `Error loading index.html from path: ${UI_FILE_PATH}`;
            res.end(errorMessage);
            console.error(`[HTTP Handler] Error reading ${UI_FILE_PATH}:`, err);
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
}

export function handleSubmitTranscribedText(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        console.log(`[HTTP Handler /submit-transcribed-text] Received request body: ${body}`);
        try {
            const parsedBody = JSON.parse(body);
            console.log(`[HTTP Handler /submit-transcribed-text] Parsed body:`, parsedBody);
            if (parsedBody.text && typeof parsedBody.text === 'string') {
                if (resolveVoiceCommandPromise.current) {
                    console.log(`[HTTP Handler /submit-transcribed-text] Active listener found. Resolving promise with text: "${parsedBody.text}"`);
                    resolveVoiceCommandPromise.current(parsedBody.text);
                    resolveVoiceCommandPromise.current = null; // Clear resolver
                    if (rejectVoiceCommandPromise.current) rejectVoiceCommandPromise.current = null; // Clear rejecter
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Text submitted successfully' }));
                } else {
                    console.warn('[HTTP Handler /submit-transcribed-text] Received text but no active voice command listener (resolveVoiceCommandPromise.current is null).');
                    res.writeHead(409, { 'Content-Type': 'application/json' }); // Conflict or Bad State
                    res.end(JSON.stringify({ error: 'No active voice command listener' }));
                }
            } else {
                console.warn('[HTTP Handler /submit-transcribed-text] Invalid request body: "text" field missing or not a string.');
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request body: "text" field is missing or not a string' }));
            }
        } catch (e: any) {
            console.error('[HTTP Handler] Error parsing JSON for /submit-transcribed-text:', e.message);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
        }
    });
}

export function handleVoiceEvents(req: http.IncomingMessage, res: http.ServerResponse): void {
    console.log('[SSE Handler] Client connected for voice events.');
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });
    res.write('data: {"type":"connection_established","message":"Connected to voice event stream."}\n\n'); // Initial event

    sseClients.push(res); 

    req.on('close', () => {
        const clientIndex = sseClients.indexOf(res);
        if (clientIndex > -1) {
            sseClients.splice(clientIndex, 1);
        }
        console.log('[SSE Handler] Client disconnected. Remaining clients:', sseClients.length);
    });
}

export function handleStaticFile(req: http.IncomingMessage, res: http.ServerResponse, requestedPath: string): void {
    const uiBaseDir = getUiBaseDir();
    const filePath = path.join(uiBaseDir, requestedPath);
    // Basic security: prevent directory traversal
    if (!filePath.startsWith(uiBaseDir)) {
        console.warn(`[HTTP Static] Attempted directory traversal: ${requestedPath}`);
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.log(`[HTTP Static] File not found: ${filePath}`);
                handleNotFound(req, res); // Delegate to existing 404 handler
            } else {
                console.error(`[HTTP Static] Error reading file ${filePath}:`, err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error');
            }
            return;
        }

        let contentType = 'text/plain';
        if (filePath.endsWith('.js')) {
            contentType = 'application/javascript';
        } else if (filePath.endsWith('.css')) {
            contentType = 'text/css';
        } // Add more MIME types if needed

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
        console.log(`[HTTP Static] Served: ${filePath} as ${contentType}`);
    });
}


export function handleNotFound(req: http.IncomingMessage, res: http.ServerResponse): void {
    console.log(`[HTTP Handler] 404 Not Found for URL: ${req.url}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
}
