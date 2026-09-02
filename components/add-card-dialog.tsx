'use client';

import { useState } from 'react';
import { LoaderCircle, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

type Result = {
  id: string;
  name: string;
  number: string;
  set: string;
  image: string | null;
  language: 'en' | 'ja';
  tcgplayerUrl?: string;
  prices: Array<{ finish: string; marketPriceCents: number | null }>;
  marketPriceCents: number | null;
};

export function AddCardDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<'en' | 'ja'>('en');
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  async function search() {
    if (query.trim().length < 2) return;
    setBusy(true);
    const response = await fetch(
      `/api/cards/search?q=${encodeURIComponent(query)}&language=${language}`,
    );
    const data = (await response.json()) as { cards?: Result[] };
    setResults(data.cards ?? []);
    setBusy(false);
  }
  async function add(card: Result) {
    setBusy(true);
    await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        externalId: card.id,
        language: card.language,
        name: card.name,
        setName: card.set,
        collectorNumber: card.number,
        imageUrl: card.image,
        tcgplayerUrl: card.tcgplayerUrl,
        finish: card.prices[0]?.finish ?? 'normal',
        marketPriceCents: card.marketPriceCents,
        condition: 'near_mint',
        quantity: 1,
      }),
    });
    setOpen(false);
    window.location.reload();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-9 rounded-full px-4 shadow-[0_7px_20px_rgba(217,48,37,.2)]" />
        }
      >
        <Plus /> Add card
      </DialogTrigger>
      <DialogContent className="max-h-[82vh] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a card</DialogTitle>
          <DialogDescription>
            Search the English or Japanese catalog, then select the exact
            printing.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <NativeSelect
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'ja')}
            className="w-32"
          >
            <NativeSelectOption value="en">English</NativeSelectOption>
            <NativeSelectOption value="ja">Japanese</NativeSelectOption>
          </NativeSelect>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Charizard, Pikachu…"
          />
          <Button
            onClick={search}
            disabled={busy || query.trim().length < 2}
            aria-label="Search cards"
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <Search />}
          </Button>
        </div>
        <div className="max-h-[54vh] space-y-2 overflow-y-auto pr-1">
          {results.map((card) => (
            <button
              key={card.id}
              onClick={() => add(card)}
              className="flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors hover:bg-muted"
            >
              {card.image ? (
                <img
                  src={card.image}
                  alt=""
                  className="h-20 w-14 rounded-md object-cover"
                />
              ) : (
                <div className="h-20 w-14 rounded-md bg-muted" />
              )}
              <span className="min-w-0 flex-1">
                <strong className="block truncate">{card.name}</strong>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {card.set} · {card.number}
                </span>
              </span>
              <span className="text-sm font-semibold">
                {card.marketPriceCents == null
                  ? 'Unpriced'
                  : `$${(card.marketPriceCents / 100).toFixed(2)}`}
              </span>
            </button>
          ))}
          {!busy && results.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Search to find the exact card and printing.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
