-- ============================================================================
-- plugin-financial 009: server-plane agent write RPC.
--
-- public.agent_financial_mark_payment_received — "marca o atendimento como
-- pago em cartão 2x". Resolves the order (directly or via a booking id),
-- guard-checks the actor (agent_guard, spine 015), promotes the order into an
-- invoice + installment ledger through the EXISTING invariant function
-- fn_invoice_from_order (004) — never re-implementing its numbering/allocation
-- logic — then settles the installments following 008's split model (bill rows
-- flip to paid; each cash event is its own movement_kind='payment' row).
--
-- fn_invoice_from_order authorizes via user_tenant_ids() (auth.uid()). This
-- RPC runs under the broker's service key, so it impersonates the ALREADY
-- GUARD-VERIFIED actor for the duration of the transaction by setting
-- request.jwt.claims locally — the invariant function keeps working unchanged
-- and the audit trail carries the real acting user.
--
-- Contract: (p_tenant_id, p_actor_user_id, p_payload) → jsonb
--   payload {order_id? uuid, booking_id? uuid, method text
--            ('cash'|'pix'|'credit_card'|'debit_card'|'transfer'),
--            installments? int (credit_card only, 1–12), amount? numeric}
-- ============================================================================

CREATE OR REPLACE FUNCTION public.agent_financial_mark_payment_received(
  p_tenant_id uuid,
  p_actor_user_id uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_denial jsonb;
  v_order_id uuid;
  v_booking_id uuid;
  v_method text;
  v_installments int;
  v_amount numeric;
  v_order record;
  v_bill record;
  v_paid_count int := 0;
  v_total_paid numeric := 0;
BEGIN
  -- ── payload ──────────────────────────────────────────────────────────────
  BEGIN
    v_order_id   := (p_payload->>'order_id')::uuid;
    v_booking_id := (p_payload->>'booking_id')::uuid;
    v_amount     := (p_payload->>'amount')::numeric;
    v_installments := COALESCE((p_payload->>'installments')::int, 1);
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid payload: ' || SQLERRM);
  END;
  v_method := lower(COALESCE(p_payload->>'method', 'cash'));
  IF v_method NOT IN ('cash', 'pix', 'credit_card', 'debit_card', 'transfer') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown payment method');
  END IF;
  IF v_installments NOT BETWEEN 1 AND 12
     OR (v_installments > 1 AND v_method <> 'credit_card') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'installments require credit_card (1-12)');
  END IF;

  -- booking → order
  IF v_order_id IS NULL AND v_booking_id IS NOT NULL THEN
    SELECT b.order_id INTO v_order_id
    FROM appointments b
    WHERE b.id = v_booking_id AND b.tenant_id = p_tenant_id;
  END IF;
  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_id or booking_id required (booking must have an order)');
  END IF;

  SELECT o.id, o.status, o.total INTO v_order
  FROM orders o
  WHERE o.id = v_order_id AND o.tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown order for this tenant');
  END IF;
  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot receive payment on a cancelled order');
  END IF;

  -- ── authorization ────────────────────────────────────────────────────────
  v_denial := agent_guard(p_tenant_id, p_actor_user_id, 'financial.receivables', 'update');
  IF v_denial IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'denial', v_denial);
  END IF;

  -- already fully paid?
  IF EXISTS (
    SELECT 1 FROM plg_financial_movements m
    WHERE m.invoice_id = v_order_id AND m.movement_kind = 'bill'
  ) AND NOT EXISTS (
    SELECT 1 FROM plg_financial_movements m
    WHERE m.invoice_id = v_order_id AND m.movement_kind = 'bill' AND m.status <> 'paid'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order is already fully paid');
  END IF;

  -- ── invoice via the existing invariant function (impersonate the verified
  --     actor so fn_invoice_from_order's user_tenant_ids() check passes) ─────
  PERFORM set_config('request.jwt.claims',
                     jsonb_build_object('sub', p_actor_user_id, 'role', 'authenticated')::text,
                     true);
  PERFORM fn_invoice_from_order(v_order_id, current_date, NULL, v_installments, 'credit');

  -- ── settle: flip pending bill installments to paid + emit payment rows ───
  FOR v_bill IN
    SELECT m.* FROM plg_financial_movements m
    WHERE m.invoice_id = v_order_id
      AND m.tenant_id = p_tenant_id
      AND m.movement_kind = 'bill'
      AND m.status <> 'paid'
    ORDER BY m.installment_number NULLS FIRST
  LOOP
    UPDATE plg_financial_movements SET
      status = 'paid',
      paid_amount = v_bill.amount,
      payment_date = current_date,
      card_installments = CASE WHEN v_method = 'credit_card' THEN v_installments ELSE NULL END,
      metadata = COALESCE(metadata, '{}'::jsonb)
                 || jsonb_build_object('paidVia', 'agent', 'method', v_method),
      updated_at = now()
    WHERE id = v_bill.id;

    INSERT INTO plg_financial_movements
      (tenant_id, invoice_id, direction, movement_kind, amount, paid_amount, status,
       due_date, payment_date, installment_number, card_installments, metadata)
    VALUES
      (p_tenant_id, v_order_id, v_bill.direction, 'payment', v_bill.amount, v_bill.amount,
       'paid', v_bill.due_date, current_date, v_bill.installment_number,
       CASE WHEN v_method = 'credit_card' THEN v_installments ELSE NULL END,
       jsonb_build_object('source', 'agent', 'method', v_method));

    v_paid_count := v_paid_count + 1;
    v_total_paid := v_total_paid + v_bill.amount;
  END LOOP;

  IF v_paid_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no open installments found to settle');
  END IF;

  INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_user_id, 'agent.markPaymentReceived', 'order', v_order_id::text,
          jsonb_build_object('payload', p_payload, 'installmentsSettled', v_paid_count,
                             'totalPaid', v_total_paid));

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_order_id,
    'record', jsonb_build_object(
      'ref', jsonb_build_object('id', v_order_id, 'resource', 'orders',
                                'archetype', 'order:service_order'),
      'method', v_method,
      'installments', v_installments,
      'installments_settled', v_paid_count,
      'total_paid', v_total_paid
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.agent_financial_mark_payment_received(uuid, uuid, jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.agent_financial_mark_payment_received(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.agent_financial_mark_payment_received(uuid, uuid, jsonb)
  TO authenticated, service_role;
