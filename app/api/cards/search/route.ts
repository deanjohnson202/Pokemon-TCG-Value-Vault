import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV === 'production')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  const language = url.searchParams.get('language') === 'ja' ? 'ja' : 'en';
  if (!q || q.length < 2) return NextResponse.json({ cards: [] });

  if (language === 'ja') {
    const response = await fetch(
      `https://api.tcgdex.net/v2/ja/cards?name=${encodeURIComponent(q)}`,
    );
    if (!response.ok) return NextResponse.json({ cards: [] });
    const data = (await response.json()) as Array<{
      id: string;
      localId: string;
      name: string;
      image?: string;
    }>;
    return NextResponse.json({
      cards: data.slice(0, 16).map((card) => ({
        id: card.id,
        name: card.name,
        number: card.localId,
        set: 'Japanese release',
        image: card.image ? `${card.image}/high.webp` : null,
        language: 'ja',
        prices: [],
        marketPriceCents: null,
      })),
    });
  }

  const response = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`name:${q}*`)}&pageSize=16`,
  );
  if (!response.ok) return NextResponse.json({ cards: [] });
  const payload = (await response.json()) as { data: Array<any> };
  return NextResponse.json({
    cards: payload.data.map((card) => {
      const prices = Object.entries(card.tcgplayer?.prices ?? {}).map(
        ([finish, value]: [string, any]) => ({
          finish,
          marketPriceCents:
            value.market == null ? null : Math.round(value.market * 100),
        }),
      );
      return {
        id: card.id,
        name: card.name,
        number: card.number,
        set: card.set?.name ?? 'Unknown set',
        image: card.images?.large,
        language: 'en',
        tcgplayerUrl: card.tcgplayer?.url,
        prices,
        marketPriceCents: prices[0]?.marketPriceCents ?? null,
      };
    }),
  });
}
