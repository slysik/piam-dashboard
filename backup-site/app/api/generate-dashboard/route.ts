/**
 * AI Dashboard Generation API
 *
 * Generates PIAM (Physical Identity and Access Management) dashboard specifications
 * using GPT-4o. This endpoint accepts natural language prompts and returns structured
 * JSON dashboard configurations via Server-Sent Events (SSE) for real-time streaming.
 *
 * @module api/generate-dashboard
 *
 * ## Purpose
 *
 * Enables dynamic dashboard creation through AI, allowing users to describe
 * their desired dashboard in plain English and receive a structured specification
 * that can be rendered by the frontend dashboard builder.
 *
 * ## Environment Variables
 *
 * - `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (required)
 * - `AI_INTEGRATIONS_OPENAI_BASE_URL` - Custom OpenAI-compatible API base URL (optional)
 *
 * ## Streaming Protocol
 *
 * Uses Server-Sent Events (SSE) format:
 * - Each chunk: `data: {"content": "<partial JSON>"}\n\n`
 * - End marker: `data: [DONE]\n\n`
 *
 * @endpoint POST /api/generate-dashboard
 *
 * @example
 * // Generate a security overview dashboard
 * curl -X POST http://localhost:3000/api/generate-dashboard \
 *   -H "Content-Type: application/json" \
 *   -d '{"prompt": "Create a security overview dashboard showing access denials, suspicious activities, and compliance status"}' \
 *   --no-buffer
 *
 * @example
 * // Generate an executive summary dashboard
 * curl -X POST http://localhost:3000/api/generate-dashboard \
 *   -H "Content-Type: application/json" \
 *   -d '{"prompt": "Executive summary with KPIs for total badges, active areas, and weekly access trends"}'
 *
 * @example
 * // JavaScript EventSource client
 * const response = await fetch('/api/generate-dashboard', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ prompt: 'Dashboard for parking garage access' })
 * });
 *
 * const reader = response.body.getReader();
 * const decoder = new TextDecoder();
 * let fullContent = '';
 *
 * while (true) {
 *   const { done, value } = await reader.read();
 *   if (done) break;
 *
 *   const chunk = decoder.decode(value);
 *   const lines = chunk.split('\n');
 *   for (const line of lines) {
 *     if (line.startsWith('data: ') && line !== 'data: [DONE]') {
 *       const json = JSON.parse(line.slice(6));
 *       fullContent += json.content;
 *     }
 *   }
 * }
 *
 * const dashboardSpec = JSON.parse(fullContent);
 */
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * OpenAI client instance configured with custom API key and optional base URL.
 * Supports OpenAI-compatible APIs (e.g., Azure OpenAI, local LLM servers).
 *
 * @constant
 * @type {OpenAI}
 */
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

/**
 * Handles POST requests to generate AI-powered dashboard specifications.
 *
 * Uses GPT-4o with streaming to generate structured dashboard JSON based on
 * natural language prompts. The response is streamed as Server-Sent Events
 * for real-time UI updates.
 *
 * @async
 * @function POST
 * @param {NextRequest} request - The incoming HTTP request
 *
 * @requestBody
 * ```typescript
 * {
 *   prompt: string;  // Natural language dashboard description (required)
 * }
 * ```
 *
 * @returns {Promise<Response>} SSE stream with dashboard specification chunks
 *
 * @response 200 - Streaming Response (text/event-stream)
 *
 * Stream format:
 * ```
 * data: {"content": "{"}\n\n
 * data: {"content": "\"title\":"}\n\n
 * data: {"content": " \"Security Dashboard\""}\n\n
 * ...
 * data: [DONE]\n\n
 * ```
 *
 * Complete streamed JSON schema:
 * ```typescript
 * {
 *   title: string;          // Dashboard title
 *   description: string;    // Brief description
 *   kpis: Array<{
 *     label: string;        // KPI display label
 *     value: string;        // Formatted value
 *     trend: string;        // Trend indicator (e.g., "+5%", "-2%")
 *     color: string;        // Color code or name
 *   }>;
 *   charts: Array<{
 *     type: string;         // Chart type (bar, line, pie, etc.)
 *     title: string;        // Chart title
 *     data: any;            // Chart-specific data structure
 *   }>;
 *   tables: Array<{
 *     title: string;        // Table title
 *     columns: string[];    // Column headers
 *     sampleRows: any[][];  // Sample data rows
 *   }>;
 *   alerts: Array<{
 *     severity: string;     // Alert level (info, warning, critical)
 *     title: string;        // Alert title
 *     description: string;  // Alert details
 *   }>;
 * }
 * ```
 *
 * @response 500 - Server Error
 * ```typescript
 * {
 *   error: "Failed to generate dashboard"
 * }
 * ```
 *
 * @headers
 * - Content-Type: text/event-stream
 * - Cache-Control: no-cache
 * - Connection: keep-alive
 *
 * ## AI System Prompt
 *
 * The AI is instructed to act as a PIAM dashboard designer, generating
 * realistic physical access management data including:
 * - Access events and credentials
 * - Area and door configurations
 * - Compliance and audit data
 * - Security alerts and anomalies
 *
 * @throws {Error} When OpenAI API call fails or stream processing errors
 */
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `You are a PIAM (Physical Identity and Access Management) dashboard designer AI. When given a request, you generate a detailed dashboard specification in JSON format.

Your response should be a valid JSON object with these fields:
- title: Dashboard title
- description: Brief description
- kpis: Array of KPI cards with {label, value, trend, color}
- charts: Array of chart configs with {type, title, data}
- tables: Array of table configs with {title, columns, sampleRows}
- alerts: Array of alert configs with {severity, title, description}

Be creative and realistic with PIAM data (access events, credentials, areas, compliance, etc).
Return ONLY valid JSON, no markdown.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error generating dashboard:', error);
    return NextResponse.json({ error: 'Failed to generate dashboard' }, { status: 500 });
  }
}
