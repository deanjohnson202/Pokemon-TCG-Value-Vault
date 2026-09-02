'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  ChevronDown,
  Grid2X2,
  List,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AddCardDialog } from '@/components/add-card-dialog';

const cards = [
  {
    name: 'Charizard',
    set: 'Base Set',
    number: '4/102',
    finish: 'Holofoil',
    condition: 'Near Mint',
    quantity: 1,
    price: '$417.63',
    change: '+8.4%',
    positive: true,
    image: 'https://images.pokemontcg.io/base1/4_hires.png',
  },
  {
    name: 'Gengar VMAX',
    set: 'Fusion Strike',
    number: '271/264',
    finish: 'Holofoil',
    condition: 'Near Mint',
    quantity: 1,
    price: '$356.92',
    change: '+3.1%',
    positive: true,
    image: 'https://images.pokemontcg.io/swsh8/271_hires.png',
  },
  {
    name: 'Umbreon VMAX',
    set: 'Evolving Skies',
    number: '215/203',
    finish: 'Holofoil',
    condition: 'Lightly Played',
    quantity: 1,
    price: '$1,129.44',
    change: '-1.8%',
    positive: false,
    image: 'https://images.pokemontcg.io/swsh7/215_hires.png',
  },
  {
    name: 'Mew ex',
    set: 'Paldean Fates',
    number: '232/091',
    finish: 'Holofoil',
    condition: 'Near Mint',
    quantity: 2,
    price: '$624.18',
    change: '+5.7%',
    positive: true,
    image: 'https://images.pokemontcg.io/sv4pt5/232_hires.png',
  },
];

export default function Home() {
  const [liveCards, setLiveCards] = useState<typeof cards>([]);
  useEffect(() => {
    fetch('/api/inventory')
      .then((response) => response.json())
      .then((data) => {
        if (!Array.isArray(data.inventory)) return;
        setLiveCards(
          data.inventory.map((item: any) => ({
            name: item.name,
            set: item.setName,
            number: item.collectorNumber,
            finish: item.finish.replace(/([A-Z])/g, ' $1'),
            condition: item.condition
              .replaceAll('_', ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            quantity: item.quantity,
            price:
              item.manualValueCents != null || item.marketPriceCents != null
                ? `$${(((item.manualValueCents ?? item.marketPriceCents) * item.quantity) / 100).toFixed(2)}`
                : 'Unpriced',
            change: 'New',
            positive: true,
            image: item.imageUrl ?? '',
          })),
        );
      })
      .catch(() => undefined);
  }, []);
  const displayCards = liveCards.length ? liveCards : cards;
  const totalValue = liveCards.reduce(
    (sum, card) => sum + (Number(card.price.replace(/[$,]/g, '')) || 0),
    0,
  );
  const totalQuantity = liveCards.reduce((sum, card) => sum + card.quantity, 0);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-8 px-5 lg:px-8">
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
          <nav
            className="hidden h-full items-center gap-7 text-sm font-medium md:flex"
            aria-label="Primary navigation"
          >
            <a className="nav-active" href="#collection">
              Collection
            </a>
            <a
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="#sets"
            >
              Sets
            </a>
            <a
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="#history"
            >
              History
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              className="hidden h-9 rounded-full px-4 sm:inline-flex"
            >
              <Boxes /> Import
            </Button>
            <AddCardDialog />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-5 py-8 lg:px-8 lg:py-11">
        <section
          className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end"
          aria-labelledby="collection-title"
        >
          <div>
            <p className="eyebrow">YOUR COLLECTION</p>
            <h1
              id="collection-title"
              className="mt-2 text-3xl font-bold tracking-[-0.035em] sm:text-[40px]"
            >
              The whole collection, at a glance.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {liveCards.length
                ? `${totalQuantity} cards · ${new Set(liveCards.map((card) => card.set)).size} sets`
                : 'Sample view · Add your first card to begin your collection'}
            </p>
          </div>
          <div className="relative w-full xl:max-w-[430px]">
            <Search className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 rounded-2xl border-border bg-card pl-11 pr-20 shadow-sm"
              placeholder="Search by card, set, or number…"
              aria-label="Search collection"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
              ⌘ K
            </kbd>
          </div>
        </section>

        <section
          className="mt-8 grid gap-4 md:grid-cols-3"
          aria-label="Collection summary"
        >
          <Card className="metric-card">
            <CardContent className="flex h-full flex-col justify-between p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="metric-label">TOTAL MARKET VALUE</span>
                <span className="live-dot">LIVE</span>
              </div>
              <div className="mt-9 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold tracking-[-0.04em] sm:text-[38px]">
                    {liveCards.length
                      ? `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '$18,642.80'}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <ArrowUpRight className="size-3.5" />{' '}
                    {liveCards.length
                      ? 'Tracking started'
                      : '$436.22 this week'}
                  </p>
                </div>
                <div
                  className="sparkline"
                  aria-label="Value increased over the last seven days"
                >
                  <svg viewBox="0 0 120 48" role="img">
                    <path
                      className="spark-fill"
                      d="M1,42 C14,40 18,31 29,33 C42,35 46,23 58,27 C70,31 76,16 88,20 C101,24 106,7 119,5 L119,48 L1,48 Z"
                    />
                    <path
                      className="spark-stroke"
                      d="M1,42 C14,40 18,31 29,33 C42,35 46,23 58,27 C70,31 76,16 88,20 C101,24 106,7 119,5"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="flex h-full flex-col justify-between p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="metric-label">CARDS OWNED</span>
                <Boxes className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-9">
                <p className="text-3xl font-bold tracking-[-0.04em] sm:text-[38px]">
                  {liveCards.length ? totalQuantity : '1,284'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  <strong className="text-foreground">
                    {liveCards.length ? liveCards.length : 842}
                  </strong>{' '}
                  unique cards
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="flex h-full flex-col justify-between p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="metric-label">SET COMPLETION</span>
                <BarChart3 className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-9">
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold tracking-[-0.04em] sm:text-[38px]">
                    68%
                  </p>
                  <span className="text-xs text-muted-foreground">
                    Top 12 sets
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[68%] rounded-full bg-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section
          id="collection"
          className="mt-11"
          aria-labelledby="cards-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
            <div>
              <p className="eyebrow">INVENTORY</p>
              <h2
                id="cards-heading"
                className="mt-1.5 text-xl font-bold tracking-tight"
              >
                Most valuable cards
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-full">
                <SlidersHorizontal /> Filter <ChevronDown />
              </Button>
              <div
                className="flex rounded-full border bg-card p-1"
                aria-label="View options"
              >
                <Button
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Grid view"
                >
                  <Grid2X2 />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="rounded-full"
                  aria-label="List view"
                >
                  <List />
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:gap-x-6">
            {displayCards.map((card) => (
              <article
                key={`${card.set}-${card.number}`}
                className="card-tile group cursor-pointer"
              >
                <div className="card-image-wrap">
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={`${card.name} from ${card.set}`}
                      className="card-image"
                    />
                  ) : (
                    <div className="grid h-full place-items-center p-5 text-center text-xs text-muted-foreground">
                      Image unavailable
                    </div>
                  )}
                  <span className="quantity-pill">×{card.quantity}</span>
                </div>
                <div className="pt-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold tracking-tight sm:text-[15px]">
                        {card.name}
                      </h3>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {card.set} · {card.number}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums sm:text-[15px]">
                        {card.price}
                      </p>
                      <p
                        className={`mt-1 flex items-center justify-end text-[11px] font-semibold ${card.positive ? 'text-emerald-700' : 'text-red-600'}`}
                      >
                        {card.positive ? (
                          <ArrowUpRight className="size-3" />
                        ) : (
                          <ArrowDownRight className="size-3" />
                        )}
                        {card.change}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="font-medium">
                      {card.condition}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="font-medium text-muted-foreground"
                    >
                      {card.finish}
                    </Badge>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
