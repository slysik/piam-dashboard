import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
