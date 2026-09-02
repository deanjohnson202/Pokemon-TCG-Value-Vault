import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type PokemonPrice = { market?: number | null };
type PokemonCard = {
  id: string;
  name: string;
  number: string;
  set?: { name?: string };
  images?: { large?: string };
  tcgplayer?: { url?: string; prices?: Record<string, PokemonPrice> };
};
type TcgDexCard = { id: string; localId: string; name: string; image?: string };

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV === 'production')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  const language = url.searchParams.get('language') === 'ja' ? 'ja' : 'en';
  if (!q || q.length < 2) return NextResponse.json({ cards: [] });

  try {
    if (language === 'ja') {
      const response = await fetch(
        `https://api.tcgdex.net/v2/ja/cards?name=${encodeURIComponent(q)}`,
      );
      if (!response.ok) throw new Error(`TCGdex returned ${response.status}`);
      const data = (await response.json()) as TcgDexCard[];
      return NextResponse.json({
        cards: data.slice(0, 24).map((card) => {
          const divider = card.id.lastIndexOf('-');
          const setCode = divider > 0 ? card.id.slice(0, divider) : card.id;
          return {
            id: card.id,
            name: card.name,
            number: card.localId,
            set: `Set ${setCode}`,
            image: card.image ? `${card.image}/high.webp` : null,
            language: 'ja',
            prices: [],
          };
        }),
      });
    }

    let response = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`name:${q}*`)}&pageSize=24`,
    );
    if (!response.ok) {
      response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`name:"${q.replaceAll('"', '')}"`)}&pageSize=24`,
      );
    }
    if (!response.ok)
      throw new Error(`Pokémon TCG API returned ${response.status}`);
    const payload = (await response.json()) as { data: PokemonCard[] };
    return NextResponse.json({
      cards: payload.data.map((card) => ({
        id: card.id,
        name: card.name,
        number: card.number,
        set: card.set?.name ?? 'Unknown set',
        image: card.images?.large ?? null,
        language: 'en',
        tcgplayerUrl: card.tcgplayer?.url,
        prices: Object.entries(card.tcgplayer?.prices ?? {}).map(
          ([finish, price]) => ({
            finish,
            marketPriceCents:
              price.market == null ? null : Math.round(price.market * 100),
          }),
        ),
      })),
    });
  } catch (error) {
    console.error('Card catalog search failed', error);
    return NextResponse.json(
      {
        error: `${language === 'ja' ? 'Japanese' : 'English'} card search is temporarily unavailable.`,
      },
      { status: 502 },
    );
  }
}
