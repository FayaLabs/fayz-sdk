import React, { useEffect, useRef, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { toast } from '@fayz/ui'
import { useCrmStore, useCrmConfig, formatCurrency } from '../CrmContext'
import { useTranslation } from '@fayz/core'
import { SubpageHeader } from '@fayz/ui'
import { DealSidebar } from './DealSidebar'
import type { Deal } from '../types'

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PipelineSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {[1, 2, 3, 4, 5].map((col) => (
        <div key={col} className="min-w-[240px] max-w-[280px] flex-shrink-0">
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="h-2 w-2 rounded-full bg-muted/40 animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
            <div className="h-3 w-5 rounded bg-muted/30 animate-pulse" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: col <= 2 ? 2 : 1 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card shadow-sm p-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted/40 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted/30 animate-pulse" />
                <div className="flex items-center justify-between pt-1">
                  <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
                  <div className="h-3 w-8 rounded bg-muted/30 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Deal card
// ---------------------------------------------------------------------------

function DealCard({ deal, saving, currency, onClick, onDragStart, onDragEnd }: {
  deal: Deal
  saving?: boolean
  currency: { code: string; locale: string; symbol: string }
  onClick?: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
}) {
  return (
    <div
      draggable={!saving}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`rounded-lg border bg-card p-3 transition-shadow ${saving ? 'opacity-70' : 'hover:shadow-sm cursor-grab active:cursor-grabbing active:opacity-70'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium truncate">{deal.title}</p>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
      </div>
      {deal.contactName && <p className="text-[10px] text-muted-foreground mt-0.5">{deal.contactName}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-semibold">{formatCurrency(deal.value, currency)}</span>
        <span className="text-[10px] text-muted-foreground">{deal.probability}%</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stage column
// ---------------------------------------------------------------------------

function StageColumn({ stageId, stageName, stageColor, deals, savingDealIds, currency, dragOverStageId, onDealClick, onAddLead, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop }: {
  stageId: string
  stageName: string
  stageColor: string
  deals: Deal[]
  savingDealIds: Set<string>
  currency: { code: string; locale: string; symbol: string }
  dragOverStageId: string | null
  onDealClick?: (id: string) => void
  onAddLead?: () => void
  onDragStart: (dealId: string, fromStageId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: () => void
}) {
  const t = useTranslation()
  const isOver = dragOverStageId === stageId
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="min-w-[240px] max-w-[280px] flex-shrink-0 flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: stageColor }} />
        <span className="text-xs font-semibold">{stageName}</span>
        <span className="text-[10px] text-muted-foreground">({deals.length})</span>
        <div className="flex-1" />
        {onAddLead && (
          <button
            onClick={onAddLead}
            className={`flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-all ${hovered ? 'opacity-100' : 'opacity-0'}`}
            title="Add lead"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex-1 space-y-2 rounded-lg p-1 transition-colors min-h-[80px] ${isOver ? 'bg-primary/5 ring-2 ring-primary/20 ring-inset' : ''}`}
      >
        {deals.length === 0 ? (
          <div className={`rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground ${isOver ? 'border-primary/30' : ''}`}>
            {isOver ? t('crm.pipeline.dropHere') : t('crm.pipeline.noDeals')}
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              saving={savingDealIds.has(deal.id)}
              currency={currency}
              onClick={() => onDealClick?.(deal.id)}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                onDragStart(deal.id, stageId)
              }}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pipeline view
// ---------------------------------------------------------------------------

export function PipelineView({ onDealClick, onViewLead, onViewQuote, onAddLead }: {
  onDealClick?: (id: string) => void
  onViewLead?: (id: string) => void
  onViewQuote?: (id: string) => void
  onAddLead?: () => void
}) {
  const { currency } = useCrmConfig()
  const pipelines = useCrmStore((s) => s.pipelines)
  const stages = useCrmStore((s) => s.stages)
  const dealsByStage = useCrmStore((s) => s.dealsByStage)
  const dealsLoading = useCrmStore((s) => s.dealsLoading)
  const fetchPipelines = useCrmStore((s) => s.fetchPipelines)
  const fetchDealsByStage = useCrmStore((s) => s.fetchDealsByStage)
  const moveDealToStage = useCrmStore((s) => s.moveDealToStage)

  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  const [savingDealIds, setSavingDealIds] = useState<Set<string>>(new Set())
  const [optimisticBoard, setOptimisticBoard] = useState<Map<string, Deal[]> | null>(null)
  const t = useTranslation()
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const dragRef = useRef<{ dealId: string; fromStageId: string } | null>(null)

  useEffect(() => { fetchPipelines() }, [])
  useEffect(() => { if (pipelines.length > 0) fetchDealsByStage(pipelines[0].id) }, [pipelines])

  // Clear optimistic state when real data arrives and no moves are in-flight
  useEffect(() => {
    if (savingDealIds.size === 0) setOptimisticBoard(null)
  }, [dealsByStage, savingDealIds])

  const visibleStages = stages.filter((s) => !s.isLost)
  const displayBoard = optimisticBoard ?? dealsByStage

  function handleDragStart(dealId: string, fromStageId: string) {
    dragRef.current = { dealId, fromStageId }
  }

  function handleDragEnd() {
    dragRef.current = null
    setDragOverStageId(null)
  }

  function handleDragOver(stageId: string, e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStageId !== stageId) setDragOverStageId(stageId)
  }

  function handleDrop(toStageId: string) {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    setDragOverStageId(null)

    if (drag.fromStageId === toStageId) return

    const { dealId, fromStageId } = drag
    const targetStage = stages.find((s) => s.id === toStageId)

    // Optimistic update — move the card instantly
    const currentBoard = optimisticBoard ?? dealsByStage
    const nextBoard = new Map(currentBoard)
    const fromDeals = [...(nextBoard.get(fromStageId) ?? [])]
    const movedDeal = fromDeals.find((d) => d.id === dealId)
    if (!movedDeal) return

    const updatedDeal: Deal = {
      ...movedDeal,
      stageId: toStageId,
      stageName: targetStage?.name,
      stageColor: targetStage?.color,
      probability: targetStage?.probability ?? movedDeal.probability,
    }

    nextBoard.set(fromStageId, fromDeals.filter((d) => d.id !== dealId))
    nextBoard.set(toStageId, [...(nextBoard.get(toStageId) ?? []), updatedDeal])
    setOptimisticBoard(nextBoard)
    setSavingDealIds((prev) => new Set(prev).add(dealId))

    // Persist in background
    moveDealToStage(dealId, toStageId)
      .then(() => {
        toast.success(t('crm.pipeline.movedTo', { stage: targetStage?.name ?? 'stage' }))
      })
      .catch(() => {
        setOptimisticBoard(null)
        toast.error(t('crm.pipeline.moveFailed'))
      })
      .finally(() => {
        setSavingDealIds((prev) => {
          const next = new Set(prev)
          next.delete(dealId)
          return next
        })
      })
  }

  function handleDealClick(dealId: string) {
    setSelectedDealId(dealId)
    onDealClick?.(dealId)
  }

  return (
    <div className="space-y-4">
      <SubpageHeader title={t('crm.pipeline.title')} subtitle={t('crm.pipeline.subtitle')} />

      {dealsLoading && dealsByStage.size === 0 ? (
        <PipelineSkeleton />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {visibleStages.map((stage) => {
            const deals = displayBoard.get(stage.id) ?? []
            return (
              <StageColumn
                key={stage.id}
                stageId={stage.id}
                stageName={stage.name}
                stageColor={stage.color}
                deals={deals}
                savingDealIds={savingDealIds}
                currency={currency}
                dragOverStageId={dragOverStageId}
                onDealClick={handleDealClick}
                onAddLead={onAddLead}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(stage.id, e)}
                onDragLeave={() => { if (dragOverStageId === stage.id) setDragOverStageId(null) }}
                onDrop={() => handleDrop(stage.id)}
              />
            )
          })}
        </div>
      )}

      <DealSidebar
        dealId={selectedDealId ?? ''}
        open={!!selectedDealId}
        onClose={() => setSelectedDealId(null)}
        onViewLead={onViewLead}
        onViewQuote={onViewQuote}
      />
    </div>
  )
}
