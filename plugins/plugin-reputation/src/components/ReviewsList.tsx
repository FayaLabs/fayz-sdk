import { Star } from 'lucide-react'
import { useReviews } from '../hooks/useReviews'
import { useReviewSummary } from '../hooks/useReviewSummary'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

/**
 * Default reviews list with an aggregate header — token-only so it inherits the
 * host theme. Optional: a host with bespoke review cards can ignore this and map
 * `useReviews()` / `useReviewSummary()` itself (as hempdent does on its home).
 */
export function ReviewsList({ limit, heading }: { limit?: number; heading?: string }) {
  const { reviews, loading } = useReviews({ limit })
  const { summary } = useReviewSummary()

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          {heading ? (
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-3">{heading}</h1>
          ) : null}
          {summary ? (
            <div className="flex items-center justify-center gap-2">
              <Stars rating={Math.round(summary.average)} />
              <span className="text-foreground font-semibold text-lg">{summary.average}</span>
              <span className="text-muted-foreground text-sm">· {summary.count} avaliações</span>
            </div>
          ) : null}
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Carregando avaliações…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                <div className="mb-3">
                  <Stars rating={review.rating} />
                </div>
                <p className="text-foreground text-sm leading-relaxed mb-4">"{review.text}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-primary font-semibold text-sm">
                      {review.author[0]}
                    </div>
                    <span className="text-sm font-medium text-foreground">{review.author}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{review.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
