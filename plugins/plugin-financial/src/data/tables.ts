// Central physical-table-name registry for plugin-financial. Providers import T so
// the plg_financial_* strings live in one place.
export const T = {
  movements: 'plg_financial_movements',
  chartOfAccounts: 'plg_financial_chart_of_accounts',
  bankAccounts: 'plg_financial_bank_accounts',
  cardBrands: 'plg_financial_card_brands',
  costCenters: 'plg_financial_cost_centers',
  cashRegisterSessions: 'plg_financial_cash_register_sessions',
  paymentMethods: 'plg_financial_payment_methods',
  paymentMethodTypes: 'plg_financial_payment_method_types',
} as const
