# Fayz × Bling — Briefing de Integração

> Documento de apoio para a reunião. Objetivo: alinhar o que a Fayz entrega (a loja) e o que
> queremos integrar com o Bling (retaguarda: estoque, fiscal e logística), e abrir uma trilha de
> clientes beta.

**Status:** rascunho para reunião · **Data:** 2026-06-15 · **Moeda/idioma das lojas:** BRL / pt-BR

---

## 1. Resumo (o pitch)

A Fayz gera **lojas de e-commerce prontas para produção** a partir de templates (ex.: `tannat-store` —
vinhos, `pulse-store` — sneakers/streetwear, `shopfront` — genérica). A loja moderna — vitrine, carrinho,
**checkout com Pix/Mercado Pago**, contas de cliente, acompanhamento de pedido — é o que a **Fayz resolve**.

O **Bling** já resolve a **retaguarda** do lojista brasileiro: estoque, emissão de **NF-e**, e logística
(etiquetas e rastreio). Em vez de reconstruir isso, queremos **integrar o Bling** como provedor de comércio
dentro da Fayz e **sincronizar** os dois lados.

> **"A Fayz resolve a loja. O Bling resolve o resto. A gente sincroniza."**

---

## 2. O framework de integração (uma arquitetura, vários provedores)

A integração com o Bling **não é um caso isolado** — é o **primeiro conector** de um framework de comércio
da Fayz. Um projeto na Fayz registra um ou mais **provedores de comércio** (`fayz-native`, `bling`,
`shopify`, `nuvemshop`, …) atrás de **um único contrato**.

- A Fayz **espelha todos os dados de comércio no nosso próprio banco** (Supabase, modelo canônico `shop_*`).
- **Rotinas de sincronização** mantêm canônico ↔ provedor em acordo (agendadas + via webhook).
- A vitrine e o admin **sempre** leem/escrevem no banco canônico da Fayz — **nunca** falam direto com o Bling.
- Credenciais e execução da sincronização ficam **no servidor da Fayz**, nunca no código aberto/navegador.

Resultado: independência de provedor, leitura rápida, resiliência, e **um único modelo de dados** para a
loja, para os plugins e para os agentes de IA. O **Bling é o provedor nº 1** dessa estrutura.

```
  Cliente final            Fayz (loja + canônico)                 Retaguarda
  ───────────              ──────────────────────                 ──────────
  Vitrine  ──►  Carrinho ──► Checkout (Pix/MP) ──► shop_orders ──►  Bling
                                   (Supabase: shop_products,        (pedido de venda,
                                    shop_orders, shop_customers)     NF-e, etiqueta, rastreio)
        ▲                                   │  ▲                          │
        └──── rastreio / status ◄───────────┘  └──── sync (pull/push) ◄───┘
```

---

## 3. Divisão de responsabilidades

| Domínio                         | Fayz (a loja)                         | Bling (retaguarda)                    |
|---------------------------------|----------------------------------------|----------------------------------------|
| Vitrine / catálogo (exibição)   | ✅ Renderiza, busca, SEO               | — (fonte do catálogo, opcional)        |
| Carrinho / checkout             | ✅ Carrinho, cupons, totais            | —                                      |
| **Pagamento**                   | ✅ **Pix + Mercado Pago** (webhook)    | —                                      |
| Conta do cliente / "meus pedidos"| ✅ Login, histórico, rastreio          | —                                      |
| **Estoque (fonte da verdade)**  | Espelha / decrementa na venda          | ✅ **Fonte do estoque**                |
| **Pedido (fulfillment)**        | Cria o pedido pago                     | ✅ **Recebe como pedido de venda**     |
| **Fiscal / NF-e**               | —                                      | ✅ **Emite a nota**                    |
| **Logística (etiqueta/rastreio)**| Exibe o código de rastreio ao cliente | ✅ **Gera etiqueta + transportadora**  |

---

## 4. Capacidades do conector Bling (o que queremos mapear)

Cada conector declara um **manifesto de capacidades** (quais entidades e direções suporta). Para o Bling:

1. **Catálogo + estoque (pull)** — produtos e saldo de estoque do Bling → canônico `shop_products`.
   *Bling é a fonte da verdade do estoque.*
2. **Pedido (push)** — cada pedido **pago** na loja → **pedido de venda** no Bling.
3. **NF-e / fiscal** — o Bling **emite a nota fiscal** do pedido.
4. **Logística (write-back)** — etiqueta + transportadora + **código de rastreio** do Bling → de volta para
   `shop_orders.tracking_code`, exibido na página de acompanhamento do cliente.
5. **Sincronização** — *pulls* agendados + **webhooks do Bling** para deltas de estoque e status de pedido.

---

## 5. Mapeamento de entidades

Modelo canônico da Fayz (campos reais, hoje) ↔ Bling:

| Fayz (canônico)        | Campos-chave Fayz                                              | Bling             |
|------------------------|---------------------------------------------------------------|-------------------|
| `Product`              | `sku`, `name`, `price`, `inventoryCount`, `status`, `images`  | **Produto**       |
| `Category`             | `name`, `slug`, `parentId`                                    | Categoria         |
| `Order`                | `orderNumber`, `total`, `financialStatus`, `fulfillmentStatus`, `items` | **Pedido de venda** |
| `OrderItem`            | `sku`, `quantity`, `unitPrice`, `total`                       | Item do pedido    |
| `ShopCustomer`         | `firstName`/`lastName`, `email`, `phone`                     | **Contato**       |
| `Order.tracking_code`  | (novo campo) preenchido pelo Bling                            | Rastreio/etiqueta |

A correspondência de IDs entre os dois lados fica numa tabela de mapeamento
(`commerce_external_refs`: provider, entidade, `external_id` ↔ `local_id`, `last_synced_at`, `hash`),
o que dá detecção de mudança e *upserts* idempotentes.

---

## 6. Mecânica de sincronização

- **Fonte da verdade por entidade é configurável.** Para um lojista Bling: **Bling é dono do estoque e do
  catálogo**; a Fayz é dona da vitrine e do checkout.
- **Pulls agendados** (cron) + **webhooks do Bling** para deltas em tempo real (estoque baixou, status do
  pedido mudou, NF-e emitida, rastreio gerado).
- **Push** dispara quando o pedido vira `paid` (confirmação do Pix/Mercado Pago via webhook).
- Resolução de conflito por `hash` + `last_synced_at`; toda escrita é idempotente (evita duplicar pedido/baixa).
- Cada execução fica registrada (`commerce_sync_runs`: status, cursor, estatísticas, erro) para auditoria.

---

## 7. Segurança

- **Credenciais do Bling (OAuth) ficam no servidor da Fazz**, criptografadas e isoladas por projeto/tenant —
  **nunca** no SDK open-source nem no navegador.
- Webhooks (Bling e Mercado Pago) são **verificados por assinatura** antes de qualquer escrita.
- O banco canônico usa **RLS** (isolamento por tenant); o cliente final só enxerga **os próprios pedidos**.
- Segredos de pagamento (Mercado Pago) e a *service role* do banco vivem apenas em funções de servidor.

---

## 8. O que pedimos ao Bling (para a reunião)

1. **Acesso de sandbox** + credenciais de API (Bling API v3 / OAuth) para construirmos o conector.
2. **Documentação de webhooks** (estoque, status de pedido, NF-e, rastreio) e limites de taxa (*rate limits*).
3. Confirmar o mapeamento de entidades da seção 5 (campos obrigatórios para criar pedido e emitir NF-e).
4. **Clientes beta** — lojistas que já usam o Bling e querem uma **vitrine moderna** por cima da retaguarda.
   A Fayz entrega a loja pronta; o lojista mantém todo o processo no Bling.

---

## 9. Roadmap (onde isso entra)

- **Agora (v1, lojas nativas Fayz):** `tannat-store`, `pulse-store`, `shopfront` rodando em produção sobre
  Supabase, com checkout Pix/Mercado Pago, contas de cliente, "meus pedidos" e rastreio. Estas lojas já são a
  **primeira implementação do contrato** (conector `fayz-native`).
- **Próximo (v2): conector Bling** — catálogo/estoque (pull), pedido (push), NF-e, rastreio (write-back),
  sync agendada + webhooks. Onboarding dos lojistas beta.
- **Depois:** conectores **Shopify** e **Nuvemshop** sobre o mesmo contrato; UI de registro de provedores no
  painel da Fayz.

---

*Apêndice — termos técnicos referenciam o modelo canônico real do SDK (`packages/shop/src/types.ts`) e o
pilar de arquitetura "Fayz Commerce Integration Framework" do plano interno.*
