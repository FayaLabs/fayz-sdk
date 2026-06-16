import React from 'react'
import { Star, Send, MessageSquare } from 'lucide-react'
import { Button, PageHeaderActions } from '@fayz-ai/ui'

interface Review {
  id: string
  author: string
  source: 'Google' | 'Facebook'
  rating: number
  text: string
  date: string
  replied: boolean
}

const REVIEWS: Review[] = [
  { id: '1', author: 'Camila R.', source: 'Google', rating: 5, text: 'Absolutely loved the experience. The team is professional and friendly!', date: 'Jun 15', replied: true },
  { id: '2', author: 'Tom B.', source: 'Facebook', rating: 5, text: 'Booking was effortless and the results were fantastic.', date: 'Jun 13', replied: false },
  { id: '3', author: 'Aisha K.', source: 'Google', rating: 4, text: 'Great service overall, slightly long wait but worth it.', date: 'Jun 11', replied: false },
  { id: '4', author: 'Marco P.', source: 'Google', rating: 5, text: 'Best in town. Highly recommend to anyone.', date: 'Jun 9', replied: true },
  { id: '5', author: 'Lena S.', source: 'Facebook', rating: 3, text: 'Good but the pricing could be clearer up front.', date: 'Jun 6', replied: false },
]

const DISTRIBUTION = [
  { stars: 5, count: 182 },
  { stars: 4, count: 41 },
  { stars: 3, count: 12 },
  { stars: 2, count: 4 },
  { stars: 1, count: 3 },
]

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 ${className ?? ''}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  )
}

export function ReputationHome() {
  const total = DISTRIBUTION.reduce((s, d) => s + d.count, 0)
  return (
    <div className="mx-auto max-w-6xl p-6">
      <PageHeaderActions>
        <Button><Send className="mr-1.5 h-4 w-4" /> Request reviews</Button>
      </PageHeaderActions>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-card border border-border bg-card p-5 text-center">
          <p className="text-4xl font-bold text-foreground">4.8</p>
          <Stars rating={5} className="mt-1 justify-center" />
          <p className="mt-1 text-xs text-muted-foreground">{total} reviews</p>
        </div>
        <div className="rounded-card border border-border bg-card p-5 lg:col-span-2">
          <div className="space-y-1.5">
            {DISTRIBUTION.map((d) => (
              <div key={d.stars} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-muted-foreground">{d.stars}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${(d.count / total) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {REVIEWS.map((r) => (
          <div key={r.id} className="rounded-card border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                  {r.author[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.author}</p>
                  <p className="text-xs text-muted-foreground">{r.source} · {r.date}</p>
                </div>
              </div>
              <Stars rating={r.rating} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
            <div className="mt-2">
              {r.replied ? (
                <span className="text-xs font-medium text-emerald-600">✓ Replied</span>
              ) : (
                <Button variant="outline" size="sm"><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Reply</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Mock preview · Google/Facebook review sync + automated requests ship in a later milestone.
      </p>
    </div>
  )
}
