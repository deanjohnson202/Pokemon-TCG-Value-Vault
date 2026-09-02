import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { ensureDatabase } from '@/db/ensure';
import { inventory } from '@/db/schema';

type CardInput = {
  externalId?: unknown;
  language?: unknown;
  name?: unknown;
  setName?: unknown;
  collectorNumber?: unknown;
  imageUrl?: unknown;
  tcgplayerUrl?: unknown;
  finish?: unknown;
  condition?: unknown;
  quantity?: unknown;
  marketPriceCents?: unknown;
  manualValueCents?: unknown;
  purchasePriceCents?: unknown;
};

async function ownerId() {
  const user = await getChatGPTUser();
  return (
    user?.userId ??
    (process.env.NODE_ENV !== 'production' ? 'local-owner' : null)
  );
}

function optionalCents(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
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
    .orderBy(
      desc(
        sql`coalesce(${inventory.manualValueCents}, ${inventory.marketPriceCents}, 0) * ${inventory.quantity}`,
      ),
    );
  return NextResponse.json({ inventory: rows });
}

export async function POST(request: Request) {
  const userId = await ownerId();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureDatabase();
  const body = (await request.json()) as CardInput;
  if (
    typeof body.externalId !== 'string' ||
    typeof body.name !== 'string' ||
    typeof body.setName !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Missing card details' },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const quantity = Math.max(1, Math.floor(Number(body.quantity) || 1));
  const marketPriceCents = optionalCents(body.marketPriceCents);
  const manualValueCents = optionalCents(body.manualValueCents);
  const purchasePriceCents = optionalCents(body.purchasePriceCents);
  const variant = {
    userId,
    externalId: body.externalId,
    language: body.language === 'ja' ? ('ja' as const) : ('en' as const),
    finish: typeof body.finish === 'string' ? body.finish : 'normal',
    condition:
      typeof body.condition === 'string' ? body.condition : 'near_mint',
  };
  await getDb()
    .insert(inventory)
    .values({
      id: crypto.randomUUID(),
      ...variant,
      name: body.name,
      setName: body.setName,
      collectorNumber:
        typeof body.collectorNumber === 'string' ? body.collectorNumber : '',
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : null,
      tcgplayerUrl:
        typeof body.tcgplayerUrl === 'string' ? body.tcgplayerUrl : null,
      quantity,
      marketPriceCents,
      manualValueCents,
      purchasePriceCents,
      priceUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        inventory.userId,
        inventory.externalId,
        inventory.language,
        inventory.finish,
        inventory.condition,
      ],
      set: {
        quantity: sql`${inventory.quantity} + ${quantity}`,
        marketPriceCents,
        manualValueCents:
          manualValueCents == null
            ? inventory.manualValueCents
            : manualValueCents,
        purchasePriceCents:
          purchasePriceCents == null
            ? inventory.purchasePriceCents
            : purchasePriceCents,
        updatedAt: now,
      },
    });
  const [item] = await getDb()
    .select()
    .from(inventory)
    .where(
      and(
        eq(inventory.userId, userId),
        eq(inventory.externalId, body.externalId),
        eq(inventory.language, variant.language),
        eq(inventory.finish, variant.finish),
        eq(inventory.condition, variant.condition),
      ),
    )
    .limit(1);
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(request: Request) {
  const userId = await ownerId();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureDatabase();
  const body = (await request.json()) as CardInput & { id?: unknown };
  if (typeof body.id !== 'string')
    return NextResponse.json(
      { error: 'Missing inventory id' },
      { status: 400 },
    );
  const now = new Date().toISOString();
  const [current] = await getDb()
    .select()
    .from(inventory)
    .where(and(eq(inventory.id, body.id), eq(inventory.userId, userId)))
    .limit(1);
  if (!current)
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  const nextCondition =
    typeof body.condition === 'string' ? body.condition : current.condition;
  const [collision] = await getDb()
    .select({ id: inventory.id })
    .from(inventory)
    .where(
      and(
        eq(inventory.userId, userId),
        eq(inventory.externalId, current.externalId),
        eq(inventory.language, current.language),
        eq(inventory.finish, current.finish),
        eq(inventory.condition, nextCondition),
        ne(inventory.id, body.id),
      ),
    )
    .limit(1);
  if (collision)
    return NextResponse.json(
      { error: 'That card already has an entry with this condition.' },
      { status: 409 },
    );
  await getDb()
    .update(inventory)
    .set({
      quantity: Math.max(1, Math.floor(Number(body.quantity) || 1)),
      condition: nextCondition,
      manualValueCents: optionalCents(body.manualValueCents),
      purchasePriceCents: optionalCents(body.purchasePriceCents),
      updatedAt: now,
    })
    .where(and(eq(inventory.id, body.id), eq(inventory.userId, userId)));
  const [item] = await getDb()
    .select()
    .from(inventory)
    .where(and(eq(inventory.id, body.id), eq(inventory.userId, userId)))
    .limit(1);
  if (!item)
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const userId = await ownerId();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureDatabase();
  const id = new URL(request.url).searchParams.get('id');
  if (!id)
    return NextResponse.json(
      { error: 'Missing inventory id' },
      { status: 400 },
    );
  await getDb()
    .delete(inventory)
    .where(and(eq(inventory.id, id), eq(inventory.userId, userId)));
  return new NextResponse(null, { status: 204 });
}
