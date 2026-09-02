import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { ensureDatabase } from '@/db/ensure';
import { inventory } from '@/db/schema';

async function ownerId() {
  const user = await getChatGPTUser();
  return (
    user?.userId ??
    (process.env.NODE_ENV !== 'production' ? 'local-owner' : null)
  );
}

export async function GET() {
  const userId = await ownerId();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureDatabase();
  const rows = await getDb()
    .select()
    .from(inventory)
    .where(eq(inventory.userId, userId))
    .orderBy(desc(inventory.marketPriceCents));
  return NextResponse.json({ inventory: rows });
}

export async function POST(request: Request) {
  const userId = await ownerId();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureDatabase();
  const body = (await request.json()) as Record<string, any>;
  if (!body.externalId || !body.name || !body.setName)
    return NextResponse.json(
      { error: 'Missing card details' },
      { status: 400 },
    );
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    userId,
    externalId: String(body.externalId),
    language: body.language === 'ja' ? ('ja' as const) : ('en' as const),
    name: String(body.name),
    setName: String(body.setName),
    collectorNumber: String(body.collectorNumber ?? ''),
    imageUrl: body.imageUrl || null,
    tcgplayerUrl: body.tcgplayerUrl || null,
    finish: String(body.finish ?? 'normal'),
    condition: String(body.condition ?? 'near_mint'),
    quantity: Math.max(1, Number(body.quantity) || 1),
    marketPriceCents:
      body.marketPriceCents == null ? null : Number(body.marketPriceCents),
    manualValueCents:
      body.manualValueCents == null ? null : Number(body.manualValueCents),
    purchasePriceCents:
      body.purchasePriceCents == null ? null : Number(body.purchasePriceCents),
    priceUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await getDb()
    .insert(inventory)
    .values(row)
    .onConflictDoUpdate({
      target: [
        inventory.userId,
        inventory.externalId,
        inventory.language,
        inventory.finish,
        inventory.condition,
      ],
      set: {
        quantity: row.quantity,
        marketPriceCents: row.marketPriceCents,
        updatedAt: now,
      },
    });
  return NextResponse.json({ item: row }, { status: 201 });
}
