# Financial Plugin

Accounts payable/receivable, cash registers, bank statements, and financial reporting for any SaaS vertical.

## Quick Start

```typescript
import { createFinancialPlugin } from '@fayz/saas-core/plugins/financial'

// In your createSaasApp config:
plugins: [
  createFinancialPlugin({
    currency: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  }),
]
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `modules.payables` | boolean | true | Accounts payable |
| `modules.receivables` | boolean | true | Accounts receivable |
| `modules.cashRegisters` | boolean | true | Cash register sessions |
| `modules.statements` | boolean | true | Bank statements |
| `modules.commissions` | boolean | true | Staff commissions |
| `modules.cards` | boolean | true | Card transactions |
| `currency` | object | BRL/pt-BR | Currency code, locale, symbol |
| `itemTypes` | array | service, product, other | Invoice line item types |
| `enableServiceExecution` | boolean | false | Track service execution on items |
| `contactEntity` | object | client | Person archetype kind for contacts |
| `locations` | array | [] | Business units (shows unit picker when 1+) |
| `dataProvider` | FinancialDataProvider | mock | Custom data provider |
| `navPosition` | number | 6 | Navigation order |

## Architecture

```
src/plugins/financial/
  index.ts                    # createFinancialPlugin() factory
  types.ts                    # Pure TS domain types (zero deps)
  registries.ts               # CRUD entities: payment methods, chart of accounts, etc.
  store.ts                    # Zustand UI state + provider actions
  FinancialContext.tsx         # React contexts: config, provider, store
  FinancialPage.tsx            # Main page with ModulePage layout
  data/
    types.ts                  # FinancialDataProvider interface
    mock.ts                   # In-memory mock provider
  views/                      # All sub-views (Summary, Invoices, Cash, etc.)
  components/                 # Settings, onboarding
  migrations/                 # SQL migration files
```

### Data Flow

```
createFinancialPlugin(options)
  → resolves config (labels, currency, modules, itemTypes)
  → creates provider (mock or custom)
  → creates zustand store (bound to provider)
  → returns PluginManifest with route, navigation, registries, settings tab

FinancialPage (rendered by plugin route)
  → wraps children in FinancialContextProvider (config + provider + store)
  → useModuleNavigation handles view switching + hash routing + animations
  → each view calls useFinancialStore(selector) to read/write data
```

## Type System

Core entities (in `types.ts`):

| Entity | Purpose |
|--------|---------|
| `Invoice` | Header: direction (debit/credit), date, contact, total, status |
| `InvoiceItem` | Line item: kind, description, qty, price, discount |
| `FinancialMovement` | Installments & payments: amount, due date, status |
| `BankAccount` | Bank, cash register, credit card, digital wallet |
| `CashSession` | Open/close sessions with balance reconciliation |
| `PaymentMethod` | Configured methods with discount/interest rules |
| `ChartOfAccountsNode` | Hierarchical ledger accounts |
| `CardTransaction` | Credit card installment tracking |

Status enums: `InvoiceStatus`, `MovementStatus`, `TransactionDirection`, `MovementKind`

## Registries (Plugin Settings)

Accessible via gear icon in Financial module or in global Settings > Financial tab:

| Registry | Editable | Seed Data |
|----------|----------|-----------|
| Payment Method | Yes | — |
| Ledger Account | Yes | Default chart of accounts |
| Cost Center | Yes | "General" |
| Bank Account | Yes | — |
| Payment Type | Read-only | Cash, PIX, Credit Card, Debit Card, Transfer, Check |
| Card Brand | Read-only | Visa, Mastercard, Amex, Elo, etc. |

## Database Migrations

Run in order:

1. `001_financial_base.sql` — Core tables: payment_method_types, payment_methods, bank_accounts, cash_register_sessions, invoices, invoice_items, financial_movements
2. `002_chart_of_accounts.sql` — chart_of_accounts (self-referencing tree), cost_centers
3. `003_card_brands.sql` — card_brands

All tables use `tenant_id` referencing `saas_core.tenants(id)` for multi-tenant isolation.

## Views

| View | Route suffix | Description |
|------|-------------|-------------|
| Summary | `/financial` | Dashboard with KPIs, cash flow, overdue alerts |
| Payables List | `/financial/payables/list` | Filterable invoice list (debit) |
| Payables New | `/financial/payables/new` | Create payable invoice |
| Receivables List | `/financial/receivables/list` | Filterable invoice list (credit) |
| Cash Registers | `/financial/cash/registers` | Open/close sessions |
| Statements | `/financial/statements` | Bank account statement viewer |
| Cards | `/financial/cards` | Card transaction reconciliation |
| Settings | `/financial/settings/*` | Registry CRUD management |

## Extending

### Custom Data Provider

```typescript
import type { FinancialDataProvider } from '@fayz/saas-core/plugins/financial'

const supabaseProvider: FinancialDataProvider = {
  async getInvoices(query) { /* Supabase query */ },
  async createInvoice(input) { /* Supabase insert */ },
  // ... implement all methods
}

createFinancialPlugin({ dataProvider: supabaseProvider })
```

### Vertical Customization

```typescript
// Restaurant — no commissions, custom item types
createFinancialPlugin({
  modules: { commissions: false },
  itemTypes: [
    { value: 'menu_item', label: 'Menu Item' },
    { value: 'beverage', label: 'Beverage' },
  ],
})

// Beauty salon — with service execution tracking
createFinancialPlugin({
  enableServiceExecution: true,
  contactEntity: { archetypeKind: 'client', label: 'Client' },
})
```
