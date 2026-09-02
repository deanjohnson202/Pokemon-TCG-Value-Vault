'use client';

import { FormEvent, useState } from 'react';
import { ArrowLeft, LoaderCircle, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import type { CatalogCard, InventoryItem } from '@/lib/types';
import { formatMoney, titleCase } from '@/lib/types';

const conditions = [
  'near_mint',
  'lightly_played',
  'moderately_played',
  'heavily_played',
  'damaged',
];

export function AddCardDialog({
  onSaved,
}: {
  onSaved: (item: InventoryItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<'en' | 'ja'>('en');
  const [results, setResults] = useState<CatalogCard[]>([]);
  const [selected, setSelected] = useState<CatalogCard | null>(null);
  const [finish, setFinish] = useState('normal');
  const [condition, setCondition] = useState('near_mint');
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function close() {
    setOpen(false);
    setSelected(null);
    setError('');
  }

  async function search(event?: FormEvent) {
    event?.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/cards/search?q=${encodeURIComponent(query)}&language=${language}`,
      );
      if (!response.ok) throw new Error('Search is unavailable right now.');
      const data = (await response.json()) as { cards: CatalogCard[] };
      setResults(data.cards ?? []);
      if (!data.cards?.length)
        setError(
          language === 'ja'
            ? 'No matches. Japanese searches work best with the Japanese card name.'
            : 'No matching cards found.',
        );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  }

  function choose(card: CatalogCard) {
    setSelected(card);
    setFinish(card.prices[0]?.finish ?? 'normal');
    setManualValue('');
    setPurchasePrice('');
    setQuantity(1);
    setCondition('near_mint');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const price =
      selected.prices.find((entry) => entry.finish === finish)
        ?.marketPriceCents ?? null;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          externalId: selected.id,
          language: selected.language,
          name: selected.name,
          setName: selected.set,
          collectorNumber: selected.number,
          imageUrl: selected.image,
          tcgplayerUrl: selected.tcgplayerUrl,
          finish,
          condition,
          quantity,
          marketPriceCents: price,
          purchasePriceCents:
            purchasePrice === ''
              ? null
              : Math.round(Number(purchasePrice) * 100),
          manualValueCents:
            manualValue === '' ? null : Math.round(Number(manualValue) * 100),
        }),
      });
      const data = (await response.json()) as {
        item?: InventoryItem;
        error?: string;
      };
      if (!response.ok || !data.item)
        throw new Error(data.error ?? 'Could not save this card.');
      onSaved(data.item);
      close();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not save this card.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-9 rounded-full px-4 shadow-[0_7px_20px_rgba(217,48,37,.2)]"
      >
        <Plus /> Add card
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/25 p-4 backdrop-blur-sm"
          onMouseDown={(event) =>
            event.target === event.currentTarget && close()
          }
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-card-title"
            className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10"
          >
            <header className="flex items-start justify-between border-b p-5">
              <div>
                {selected && (
                  <button
                    onClick={() => setSelected(null)}
                    className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3" /> Back to results
                  </button>
                )}
                <h2 id="add-card-title" className="text-lg font-bold">
                  {selected ? 'Add inventory details' : 'Find a card'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selected
                    ? `${selected.set} · ${selected.number}`
                    : 'Search the English or Japanese catalog.'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={close}
                aria-label="Close"
              >
                <X />
              </Button>
            </header>
            {!selected ? (
              <>
                <form
                  onSubmit={search}
                  className="flex gap-2 border-b p-4 sm:p-5"
                >
                  <NativeSelect
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value as 'en' | 'ja');
                      setResults([]);
                    }}
                    className="w-32"
                  >
                    <NativeSelectOption value="en">English</NativeSelectOption>
                    <NativeSelectOption value="ja">Japanese</NativeSelectOption>
                  </NativeSelect>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      language === 'ja' ? 'ピカチュウ…' : 'Charizard, Pikachu…'
                    }
                    aria-label="Card name"
                  />
                  <Button
                    type="submit"
                    disabled={busy || query.trim().length < 2}
                  >
                    {busy ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Search />
                    )}
                    <span className="hidden sm:inline">Search</span>
                  </Button>
                </form>
                <div className="min-h-48 flex-1 space-y-2 overflow-y-auto p-4 sm:p-5">
                  {error && (
                    <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  {results.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => choose(card)}
                      className="flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors hover:border-primary/30 hover:bg-muted"
                    >
                      {card.image ? (
                        <img
                          src={card.image}
                          alt=""
                          className="h-24 w-[68px] rounded-md object-cover"
                        />
                      ) : (
                        <div className="grid h-24 w-[68px] place-items-center rounded-md bg-muted text-[10px] text-muted-foreground">
                          No image
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate">{card.name}</strong>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {card.set} · {card.number}
                        </span>
                        <span className="mt-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {card.language === 'ja' ? 'Japanese' : 'English'}
                        </span>
                      </span>
                      <span className="text-sm font-semibold">
                        {formatMoney(card.prices[0]?.marketPriceCents ?? null)}
                      </span>
                    </button>
                  ))}
                  {!busy && !error && results.length === 0 && (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      Enter a card name to search.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <form onSubmit={save} className="overflow-y-auto p-5">
                <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
                  {selected.image ? (
                    <img
                      src={selected.image}
                      alt={`${selected.name} card`}
                      className="w-full rounded-xl shadow-lg"
                    />
                  ) : (
                    <div className="grid aspect-[.716] place-items-center rounded-xl bg-muted text-sm text-muted-foreground">
                      No image
                    </div>
                  )}
                  <div className="grid content-start gap-4">
                    <div>
                      <h3 className="text-xl font-bold">{selected.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selected.language === 'ja' ? 'Japanese' : 'English'} ·{' '}
                        {selected.set}
                      </p>
                    </div>
                    <label className="grid gap-1.5 text-xs font-semibold">
                      Finish
                      <NativeSelect
                        value={finish}
                        onChange={(e) => setFinish(e.target.value)}
                        className="w-full"
                      >
                        {(selected.prices.length
                          ? selected.prices
                          : [{ finish: 'normal', marketPriceCents: null }]
                        ).map((entry) => (
                          <NativeSelectOption
                            key={entry.finish}
                            value={entry.finish}
                          >
                            {titleCase(entry.finish)} ·{' '}
                            {formatMoney(entry.marketPriceCents)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold">
                      Condition
                      <NativeSelect
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="w-full"
                      >
                        {conditions.map((value) => (
                          <NativeSelectOption key={value} value={value}>
                            {titleCase(value)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1.5 text-xs font-semibold">
                        Quantity
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(Math.max(1, Number(e.target.value)))
                          }
                        />
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold">
                        Purchase price each
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
                          placeholder="Optional"
                        />
                      </label>
                    </div>
                    <label className="grid gap-1.5 text-xs font-semibold">
                      Manual value each
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualValue}
                        onChange={(e) => setManualValue(e.target.value)}
                        placeholder="Optional override"
                      />
                    </label>
                  </div>
                </div>
                {error && (
                  <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <div className="mt-5 flex justify-end gap-2 border-t pt-4">
                  <Button type="button" variant="outline" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy && <LoaderCircle className="animate-spin" />}Add to
                    collection
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
