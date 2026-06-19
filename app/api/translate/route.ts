import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('q')?.trim();

  if (!text) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 });
  }

  const url =
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=vi|en`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });

    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream API error' }, { status: 502 });
    }

    const json = await res.json();

    if (json.responseStatus === 200 && json.responseData?.translatedText) {
      return NextResponse.json({ translation: json.responseData.translatedText });
    }

    return NextResponse.json({ error: 'No translation returned' }, { status: 502 });

  } catch {
    return NextResponse.json({ error: 'Translation request failed' }, { status: 504 });
  }
}
