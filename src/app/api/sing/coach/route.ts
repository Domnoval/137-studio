import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface VocalData {
  avgFrequency: number;
  avgCentsDeviation: number;
  frequencyRange: { min: number; max: number };
  totalDuration: number;
  silencePercentage: number;
  pitchedFrames: number;
  totalFrames: number;
  notesCovered: string[];
}

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 },
    );
  }

  try {
    const data: VocalData = await request.json();

    const prompt = `You are an expert vocal coach analyzing a singer's performance data. Be encouraging but honest. Give specific, actionable advice. Keep your response concise (under 200 words).

Performance Data:
- Average frequency: ${data.avgFrequency.toFixed(1)} Hz
- Average pitch deviation: ${data.avgCentsDeviation.toFixed(1)} cents from target
- Vocal range used: ${data.frequencyRange.min.toFixed(0)} Hz to ${data.frequencyRange.max.toFixed(0)} Hz
- Duration: ${data.totalDuration.toFixed(1)} seconds
- Silence percentage: ${data.silencePercentage.toFixed(1)}%
- Notes covered: ${data.notesCovered.join(', ')}
- Pitched frames: ${data.pitchedFrames} out of ${data.totalFrames}

Provide:
1. A brief assessment of their vocal performance (2-3 sentences)
2. Their strongest aspect
3. One specific area to improve
4. One concrete exercise they should try next

Format your response as plain text with clear sections. Be warm and motivating — this is someone practicing to get better.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: response.status },
      );
    }

    const result = await response.json();
    const analysis = result.content?.[0]?.text || '';

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Vocal coaching error:', error);
    return NextResponse.json(
      { error: 'Failed to generate coaching feedback' },
      { status: 500 },
    );
  }
}
