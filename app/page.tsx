'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  CircleDollarSign,
  LoaderCircle,
  Pencil,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { AddCardDialog } from '@/components/add-card-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import type { InventoryItem } from '@/lib/types';
import { displayValueCents, formatMoney, titleCase } from '@/lib/types';

const conditions = [
  'near_mint',
  'lightly_played',
  'moderately_played',
  'heavily_played',
  'damaged',
];

export default function Home() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetch('/api/inventory')
      .then(async (response) => {
        const data = (await response.json()) as {
          inventory?: InventoryItem[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(data.error ?? 'Could not load the collection.');
        setItems(data.inventory ?? []);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : 'Could not load the collection.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.name, item.setName, item.collectorNumber].some((value) =>
        value.toLocaleLowerCase().includes(needle),
      ),
    );
  }, [items, query]);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce(
    (sum, item) => sum + (displayValueCents(item) ?? 0) * item.quantity,
    0,
  );
  const costBasis = items.reduce(
    (sum, item) => sum + (item.purchasePriceCents ?? 0) * item.quantity,
    0,
  );
  const unpriced = items.filter(
    (item) => displayValueCents(item) == null,
  ).length;

  function mergeItem(item: InventoryItem) {
    setItems((current) =>
      [
        ...current.filter(
          (entry) =>
            entry.id !== item.id &&
            !(
              entry.externalId === item.externalId &&
              entry.language === item.language &&
              entry.finish === item.finish &&
              entry.condition === item.condition
            ),
        ),
        item,
      ].sort(
        (a, b) =>
          (displayValueCents(b) ?? 0) * b.quantity -
          (displayValueCents(a) ?? 0) * a.quantity,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-4 px-5 lg:px-8">
          <a
            className="flex shrink-0 items-center gap-2.5"
            href="/"
            aria-label="Value Vault home"
          >
            <span className="vault-mark">
              <span />
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em]">
              VALUE VAULT
            </span>
          </a>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Personal collection
          </span>
          <div className="ml-auto">
            <AddCardDialog onSaved={mergeItem} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-5 py-8 lg:px-8 lg:py-11">
        <section className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="eyebrow">YOUR COLLECTION</p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-[40px]">
              Inventory and value, in one place.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {loading
                ? 'Loading your cards…'
                : `${totalQuantity} ${totalQuantity === 1 ? 'card' : 'cards'} · ${new Set(items.map((item) => item.setName)).size} ${new Set(items.map((item) => item.setName)).size === 1 ? 'set' : 'sets'}`}
            </p>
          </div>
          <div className="relative w-full xl:max-w-[430px]">
            <Search className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 rounded-2xl border-border bg-card pl-11 shadow-sm"
              placeholder="Search your cards, sets, or numbers…"
              aria-label="Search collection"
            />
          </div>
        </section>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <TriangleAlert className="size-4" />
            {error}
          </div>
        )}

        <section
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Collection summary"
        >
          <Metric
            label="TOTAL VALUE"
            value={formatMoney(totalValue)}
            detail={
              unpriced
                ? `${unpriced} unpriced ${unpriced === 1 ? 'entry' : 'entries'}`
                : 'All entries priced'
            }
            icon={<CircleDollarSign className="size-4" />}
          />
          <Metric
            label="CARDS OWNED"
            value={String(totalQuantity)}
            detail={`${items.length} unique ${items.length === 1 ? 'entry' : 'entries'}`}
            icon={<Boxes className="size-4" />}
          />
          <Metric
            label="COST BASIS"
            value={costBasis ? formatMoney(costBasis) : '—'}
            detail="From recorded purchases"
          />
          <Metric
            label="SETS REPRESENTED"
            value={String(new Set(items.map((item) => item.setName)).size)}
            detail="English and Japanese"
          />
        </section>

        <section className="mt-11" aria-labelledby="cards-heading">
          <div className="flex items-end justify-between gap-4 border-b pb-4">
            <div>
              <p className="eyebrow">INVENTORY</p>
              <h2
                id="cards-heading"
                className="mt-1.5 text-xl font-bold tracking-tight"
              >
                {query ? `Results for “${query}”` : 'Most valuable cards'}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          {loading ? (
            <div className="grid min-h-64 place-items-center">
              <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length ? (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-6">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setEditing(item)}
                  className="card-tile group text-left"
                >
                  <div className="card-image-wrap">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={`${item.name} from ${item.setName}`}
                        className="card-image"
                      />
                    ) : (
                      <div className="grid h-full place-items-center p-5 text-center text-xs text-muted-foreground">
                        Image unavailable
                      </div>
                    )}
                    <span className="quantity-pill">×{item.quantity}</span>
                    <span className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-white/90 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100">
                      <Pencil className="size-3.5" />
                    </span>
                  </div>
                  <div className="pt-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold">
                          {item.name}
                        </h3>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {item.setName} · {item.collectorNumber}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums">
                        {formatMoney(
                          displayValueCents(item) == null
                            ? null
                            : displayValueCents(item)! * item.quantity,
                        )}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">
                        {titleCase(item.condition)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {titleCase(item.finish)}
                      </Badge>
                      {item.language === 'ja' && (
                        <Badge variant="outline">JP</Badge>
                      )}
                      {item.manualValueCents != null && (
                        <Badge variant="outline">Manual value</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid min-h-72 place-items-center rounded-2xl border border-dashed bg-card/40 p-8 text-center">
              <div>
                <Boxes className="mx-auto size-8 text-muted-foreground" />
                <h3 className="mt-4 font-bold">
                  {items.length
                    ? 'No matching cards'
                    : 'Your collection is empty'}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  {items.length
                    ? 'Try a different collection search.'
                    : 'Use Add card to search the live catalog and save your first inventory entry.'}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
      {editing && (
        <EditCard
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(item) => {
            mergeItem(item);
            setEditing(null);
          }}
          onDeleted={(id) => {
            setItems((current) => current.filter((item) => item.id !== id));
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="metric-card">
      <CardContent className="flex h-full flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <span className="metric-label">{label}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="mt-7">
          <p className="text-3xl font-bold tracking-[-0.04em]">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EditCard({
  item,
  onClose,
  onSaved,
  onDeleted,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [condition, setCondition] = useState(item.condition);
  const [purchase, setPurchase] = useState(
    item.purchasePriceCents == null
      ? ''
      : String(item.purchasePriceCents / 100),
  );
  const [manual, setManual] = useState(
    item.manualValueCents == null ? '' : String(item.manualValueCents / 100),
  );
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          quantity,
          condition,
          purchasePriceCents:
            purchase === '' ? null : Math.round(Number(purchase) * 100),
          manualValueCents:
            manual === '' ? null : Math.round(Number(manual) * 100),
        }),
      });
      const data = (await response.json()) as {
        item?: InventoryItem;
        error?: string;
      };
      if (!response.ok || !data.item)
        throw new Error(data.error ?? 'Could not update this card.');
      onSaved(data.item);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not update this card.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/inventory?id=${encodeURIComponent(item.id)}`,
        { method: 'DELETE' },
      );
      if (!response.ok) throw new Error('Delete failed');
      onDeleted(item.id);
    } catch {
      setError('Could not remove this card.');
      setBusy(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
        className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-2xl ring-1 ring-black/10"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">EDIT INVENTORY</p>
            <h2 id="edit-title" className="mt-1 text-xl font-bold">
              {item.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.setName} · {item.collectorNumber} · {titleCase(item.finish)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </Button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold">
            Condition
            <NativeSelect
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              className="w-full"
            >
              {conditions.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {titleCase(value)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Quantity
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Number(event.target.value)))
              }
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Purchase price each
            <Input
              type="number"
              min="0"
              step="0.01"
              value={purchase}
              onChange={(event) => setPurchase(event.target.value)}
              placeholder="Unknown"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Manual value each
            <Input
              type="number"
              min="0"
              step="0.01"
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              placeholder={formatMoney(item.marketPriceCents)}
            />
          </label>
        </div>
        <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
          <span className="text-muted-foreground">TCGplayer market:</span>{' '}
          <strong>{formatMoney(item.marketPriceCents)}</strong>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-5 flex items-center justify-between border-t pt-4">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive">
                Remove permanently?
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={remove}
                disabled={busy}
              >
                Yes, remove
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Remove
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" />}Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
