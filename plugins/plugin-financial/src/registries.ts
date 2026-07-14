import type { PluginRegistryDef } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'

// ---------------------------------------------------------------------------
// Payment Method Types (seeded — Cash, PIX, Credit Card, etc.)
// ---------------------------------------------------------------------------

const paymentMethodTypeEntity: EntityDef = {
  name: 'Payment Type',
  namePlural: 'Payment Types',
  icon: 'CreditCard',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'transactionType', label: 'Transaction Type', type: 'select', options: ['cash', 'credit_card', 'debit_card', 'pix', 'bank_transfer', 'check', 'voucher'], showInTable: true, required: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'plg_financial_payment_method_types', tenantScoped: true },
}

// ---------------------------------------------------------------------------
// Payment Methods (user-created — e.g. "Visa 2x", "PIX Store")
// ---------------------------------------------------------------------------

const paymentMethodEntity: EntityDef = {
  name: 'Payment Method',
  namePlural: 'Payment Methods',
  icon: 'CreditCard',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    // FK to the seeded payment_method_types catalog — load real ids at runtime
    // (a static enum select would write the string into the uuid column).
    { key: 'paymentMethodTypeId', label: 'Type', type: 'relation', relation: { table: 'plg_financial_payment_method_types', labelField: 'name' }, showInTable: true, required: true },
    { key: 'discountValue', label: 'Discount %', type: 'number', showInTable: true },
    { key: 'interestValue', label: 'Interest %', type: 'number', showInTable: true },
    { key: 'minInstallments', label: 'Min Installments', type: 'number', defaultValue: 1 },
    { key: 'maxInstallments', label: 'Max Installments', type: 'number', defaultValue: 1, showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'plg_financial_payment_methods', tenantScoped: true },
}

// ---------------------------------------------------------------------------
// Chart of Accounts (tree structure)
// ---------------------------------------------------------------------------

const chartOfAccountsEntity: EntityDef = {
  name: 'Ledger Account',
  namePlural: 'Chart of Accounts',
  icon: 'BookOpen',
  displayField: 'name',
  defaultSort: 'code',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true, showInTable: true },
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'nodeType', label: 'Type', type: 'select', options: ['group', 'leaf'], showInTable: true, required: true, defaultValue: 'leaf' },
    { key: 'parentId', label: 'Parent', type: 'text', showInTable: false },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'plg_financial_chart_of_accounts', tenantScoped: true },
}

// ---------------------------------------------------------------------------
// Cost Centers
// ---------------------------------------------------------------------------

const costCenterEntity: EntityDef = {
  name: 'Cost Center',
  namePlural: 'Cost Centers',
  icon: 'Target',
  displayField: 'name',
  defaultSort: 'code',
  fields: [
    { key: 'code', label: 'Code', type: 'text', required: true, showInTable: true },
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'plg_financial_cost_centers', tenantScoped: true },
}

// ---------------------------------------------------------------------------
// Bank Accounts (physical cash, bank, credit card, digital wallet)
// ---------------------------------------------------------------------------

const bankAccountEntity: EntityDef = {
  name: 'Bank Account',
  namePlural: 'Bank Accounts',
  icon: 'Landmark',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'accountType', label: 'Type', type: 'select', options: [
      { label: 'Bank Account', value: 'bank_account' },
      { label: 'Cash Register', value: 'cash_register' },
      { label: 'Credit Card', value: 'credit_card' },
      { label: 'Digital Wallet', value: 'digital_wallet' },
    ], showInTable: true, required: true },
    { key: 'bankName', label: 'Bank', type: 'text', showInTable: true },
    { key: 'accountNumber', label: 'Account Number', type: 'text' },
    { key: 'agencyNumber', label: 'Agency', type: 'text' },
    { key: 'initialBalance', label: 'Initial Balance', type: 'currency', defaultValue: 0 },
    { key: 'creditLimit', label: 'Credit Limit', type: 'currency' },
    { key: 'closingDay', label: 'Closing Day', type: 'number' },
    { key: 'dueDay', label: 'Due Day', type: 'number' },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'plg_financial_bank_accounts', tenantScoped: true },
}

// ---------------------------------------------------------------------------
// Card Brands (seeded)
// ---------------------------------------------------------------------------

const cardBrandEntity: EntityDef = {
  name: 'Card Brand',
  namePlural: 'Card Brands',
  icon: 'CreditCard',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'plg_financial_card_brands', tenantScoped: true },
}

// ---------------------------------------------------------------------------
// Commission Rules
// ---------------------------------------------------------------------------

const commissionRuleEntity: EntityDef = {
  name: 'Commission Rule',
  namePlural: 'Commission Rules',
  icon: 'TrendingUp',
  displayField: 'name',
  defaultSort: 'priority',
  defaultSortDir: 'desc',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'priority', label: 'Priority', type: 'number', required: true, showInTable: true, defaultValue: 1 },
    { key: 'valueType', label: 'Type', type: 'select', options: ['percentage', 'fixed'], required: true, showInTable: true, defaultValue: 'percentage' },
    { key: 'value', label: 'Value', type: 'number', required: true, showInTable: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'commission_rules', tenantScoped: true },
}

// ---------------------------------------------------------------------------
// Price Tables
// ---------------------------------------------------------------------------

const priceTableEntity: EntityDef = {
  name: 'Price Table',
  namePlural: 'Price Tables',
  icon: 'Tag',
  displayField: 'description',
  defaultSort: 'createdAt',
  defaultSortDir: 'desc',
  fields: [
    { key: 'description', label: 'Description', type: 'text', required: true, showInTable: true },
    { key: 'type', label: 'Type', type: 'select', options: ['sale', 'cost'], required: true, showInTable: true, defaultValue: 'sale' },
    { key: 'validFrom', label: 'Valid From', type: 'date', showInTable: true },
    { key: 'validUntil', label: 'Valid Until', type: 'date', showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'price_tables', tenantScoped: true },
}

// ---------------------------------------------------------------------------
// Price Variations
// ---------------------------------------------------------------------------

const priceVariationEntity: EntityDef = {
  name: 'Price Variation',
  namePlural: 'Price Variations',
  icon: 'Percent',
  displayField: 'name',
  defaultSort: 'createdAt',
  defaultSortDir: 'desc',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'variationType', label: 'Type', type: 'select', options: ['discount', 'increase'], required: true, showInTable: true },
    { key: 'valueType', label: 'Value Type', type: 'select', options: ['percentage', 'fixed'], required: true, showInTable: true },
    { key: 'value', label: 'Value', type: 'number', required: true, showInTable: true },
    { key: 'firstAppointmentOnly', label: 'First Appointment Only', type: 'boolean', defaultValue: false },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'price_variations', tenantScoped: true },
}

// ---------------------------------------------------------------------------
// Export all registries
// ---------------------------------------------------------------------------

export const financialRegistries: PluginRegistryDef[] = [
  // --- Editable registries (user manages) ---
  {
    id: 'payment-methods',
    entity: paymentMethodEntity,
    icon: 'Wallet',
    description: 'Configured payment methods with fees and installment rules',
    display: 'table',
  },
  {
    id: 'chart-of-accounts',
    entity: chartOfAccountsEntity,
    icon: 'BookOpen',
    description: 'Hierarchical chart of accounts for categorizing transactions',
    display: 'tree',
    seedData: [
      { id: 'coa-1', code: '1', name: 'Revenue', nodeType: 'group', isActive: true },
      { id: 'coa-1.1', code: '1.1', name: 'Sales Revenue', nodeType: 'group', parentId: 'coa-1', isActive: true },
      { id: 'coa-1.1.01', code: '1.1.01', name: 'Services', nodeType: 'leaf', parentId: 'coa-1.1', isActive: true },
      { id: 'coa-1.1.02', code: '1.1.02', name: 'Products', nodeType: 'leaf', parentId: 'coa-1.1', isActive: true },
      { id: 'coa-2', code: '2', name: 'Other Revenue', nodeType: 'group', isActive: true },
      { id: 'coa-2.1', code: '2.1', name: 'Financial Income', nodeType: 'leaf', parentId: 'coa-2', isActive: true },
      { id: 'coa-3', code: '3', name: 'Operational Costs', nodeType: 'group', isActive: true },
      { id: 'coa-3.1', code: '3.1', name: 'Materials & Supplies', nodeType: 'group', parentId: 'coa-3', isActive: true },
      { id: 'coa-3.1.01', code: '3.1.01', name: 'Raw Materials', nodeType: 'leaf', parentId: 'coa-3.1', isActive: true },
      { id: 'coa-3.1.02', code: '3.1.02', name: 'Consumables', nodeType: 'leaf', parentId: 'coa-3.1', isActive: true },
      { id: 'coa-4', code: '4', name: 'Expenses', nodeType: 'group', isActive: true },
      { id: 'coa-4.1', code: '4.1', name: 'Rent', nodeType: 'leaf', parentId: 'coa-4', isActive: true },
      { id: 'coa-4.2', code: '4.2', name: 'Utilities', nodeType: 'leaf', parentId: 'coa-4', isActive: true },
      { id: 'coa-4.3', code: '4.3', name: 'Payroll', nodeType: 'leaf', parentId: 'coa-4', isActive: true },
    ],
  },
  {
    id: 'cost-centers',
    entity: costCenterEntity,
    icon: 'Target',
    description: 'Cost centers for expense tracking and departmental budgets',
    display: 'table',
    seedData: [
      { id: 'cc-001', code: '001', name: 'General', isActive: true },
    ],
  },
  {
    id: 'bank-accounts',
    entity: bankAccountEntity,
    icon: 'Landmark',
    description: 'Bank accounts, cash registers, credit cards, and digital wallets',
    display: 'table',
  },
  {
    id: 'commission-rules',
    entity: commissionRuleEntity,
    icon: 'TrendingUp',
    description: 'Commission rules for service and product revenue sharing',
    display: 'table',
  },
  {
    id: 'price-tables',
    entity: priceTableEntity,
    icon: 'Tag',
    description: 'Price tables for sale and cost pricing',
    display: 'table',
  },
  {
    id: 'price-variations',
    entity: priceVariationEntity,
    icon: 'Percent',
    description: 'Discount and surcharge rules for pricing',
    display: 'table',
  },
  // --- Read-only registries (system / seeded data) ---
  {
    id: 'payment-method-types',
    entity: paymentMethodTypeEntity,
    icon: 'CreditCard',
    description: 'System payment types (cash, card, PIX, etc.)',
    display: 'table',
    readOnly: true,
    seedData: [
      { id: 'pmt-cash', name: 'Cash', transactionType: 'cash', isActive: true },
      { id: 'pmt-pix', name: 'PIX', transactionType: 'pix', isActive: true },
      { id: 'pmt-credit', name: 'Credit Card', transactionType: 'credit_card', isActive: true },
      { id: 'pmt-debit', name: 'Debit Card', transactionType: 'debit_card', isActive: true },
      { id: 'pmt-transfer', name: 'Bank Transfer', transactionType: 'bank_transfer', isActive: true },
      { id: 'pmt-check', name: 'Check', transactionType: 'check', isActive: true },
    ],
  },
  {
    id: 'card-brands',
    entity: cardBrandEntity,
    icon: 'CreditCard',
    description: 'Credit and debit card brands',
    display: 'table',
    readOnly: true,
    seedData: [
      { id: 'cb-visa', name: 'Visa', isActive: true },
      { id: 'cb-mastercard', name: 'Mastercard', isActive: true },
      { id: 'cb-amex', name: 'American Express', isActive: true },
      { id: 'cb-elo', name: 'Elo', isActive: true },
      { id: 'cb-hipercard', name: 'Hipercard', isActive: true },
      { id: 'cb-diners', name: 'Diners Club', isActive: true },
      { id: 'cb-discover', name: 'Discover', isActive: true },
      { id: 'cb-jcb', name: 'JCB', isActive: true },
      { id: 'cb-aura', name: 'Aura', isActive: true },
      { id: 'cb-hiper', name: 'Hiper', isActive: true },
    ],
  },
]
