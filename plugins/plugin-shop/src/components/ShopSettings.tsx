import React from 'react'
import { SettingsGroup, ToggleRow, SelectRow } from '@fayz-ai/saas'

export interface ShopSettingsProps {
  currency?: { code?: string; locale?: string; symbol?: string }
}

const CURRENCIES = [
  { value: 'BRL', label: 'Real (R$)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
]

const LOCALES = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' },
]

/**
 * Shop plugin settings — store, catalog, checkout and notification config.
 * Seeded from the plugin's currency option; interactive (local state). Wire to
 * persisted plugin prefs when the shop settings store lands.
 */
export function ShopSettings({ currency }: ShopSettingsProps) {
  const [code, setCode] = React.useState(currency?.code ?? 'BRL')
  const [locale, setLocale] = React.useState(currency?.locale ?? 'pt-BR')
  const [showOutOfStock, setShowOutOfStock] = React.useState(true)
  const [trackInventory, setTrackInventory] = React.useState(true)
  const [requireSku, setRequireSku] = React.useState(false)
  const [guestCheckout, setGuestCheckout] = React.useState(true)
  const [enableDiscounts, setEnableDiscounts] = React.useState(true)
  const [orderEmails, setOrderEmails] = React.useState(true)
  const [lowStockAlerts, setLowStockAlerts] = React.useState(false)

  return (
    <div className="space-y-4">
      <SettingsGroup title="Loja" description="Moeda e formatação da vitrine.">
        <SelectRow
          label="Moeda"
          description="Moeda padrão para preços e checkout."
          value={code}
          options={CURRENCIES}
          onChange={setCode}
        />
        <SelectRow
          label="Idioma / formato"
          description="Formatação de números, preços e datas."
          value={locale}
          options={LOCALES}
          onChange={setLocale}
        />
      </SettingsGroup>

      <SettingsGroup title="Catálogo" description="Como os produtos aparecem e são gerenciados.">
        <ToggleRow
          label="Mostrar produtos esgotados"
          description="Exibir itens sem estoque na vitrine."
          checked={showOutOfStock}
          onChange={setShowOutOfStock}
        />
        <ToggleRow
          label="Controlar estoque"
          description="Acompanhar quantidade e dar baixa no checkout."
          checked={trackInventory}
          onChange={setTrackInventory}
        />
        <ToggleRow
          label="Exigir SKU"
          description="Tornar o SKU obrigatório ao criar produtos."
          checked={requireSku}
          onChange={setRequireSku}
        />
      </SettingsGroup>

      <SettingsGroup title="Checkout" description="Opções de compra e pagamento.">
        <ToggleRow
          label="Checkout sem cadastro"
          description="Permitir compra como convidado."
          checked={guestCheckout}
          onChange={setGuestCheckout}
        />
        <ToggleRow
          label="Cupons de desconto"
          description="Habilitar códigos de desconto no carrinho."
          checked={enableDiscounts}
          onChange={setEnableDiscounts}
        />
      </SettingsGroup>

      <SettingsGroup title="Notificações" description="Avisos por e-mail da loja.">
        <ToggleRow
          label="E-mail de novo pedido"
          description="Notificar a equipe a cada novo pedido."
          checked={orderEmails}
          onChange={setOrderEmails}
        />
        <ToggleRow
          label="Alerta de estoque baixo"
          description="Avisar quando produtos atingirem o mínimo."
          checked={lowStockAlerts}
          onChange={setLowStockAlerts}
        />
      </SettingsGroup>
    </div>
  )
}
