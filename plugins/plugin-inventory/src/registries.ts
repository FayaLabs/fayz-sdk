import type { PluginRegistryDef } from '@fayz-ai/core'
import type { EntityDef } from '@fayz-ai/core'

const supplierEntity: EntityDef = {
  name: 'Supplier',
  namePlural: 'Suppliers',
  icon: 'Building2',
  layout: 'person',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true, searchable: true },
    { key: 'phone', label: 'Phone', type: 'phone', showInTable: true },
    { key: 'email', label: 'Email', type: 'email', showInTable: true },
    { key: 'documentNumber', label: 'Tax ID', type: 'text', showInTable: true },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: {
    table: 'people',
    tenantScoped: true,
    filters: { kind: 'supplier' },
    defaults: { kind: 'supplier' },
  },
}

const measurementUnitEntity: EntityDef = {
  name: 'Measurement Unit',
  namePlural: 'Measurement Units',
  icon: 'Ruler',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'abbreviation', label: 'Abbreviation', type: 'text', required: true, showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'plg_inventory_measurement_units', tenantScoped: true },
}

const productCategoryEntity: EntityDef = {
  name: 'Product Category',
  namePlural: 'Product Categories',
  icon: 'Tag',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'parentId', label: 'Parent', type: 'text', showInTable: false },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'plg_inventory_product_categories', tenantScoped: true },
}

const stockLocationEntity: EntityDef = {
  name: 'Stock Location',
  namePlural: 'Stock Locations',
  icon: 'Warehouse',
  displayField: 'name',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
    { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true },
  ],
  data: { table: 'plg_inventory_stock_locations', tenantScoped: true },
}

export const inventoryRegistries: PluginRegistryDef[] = [
  // --- Editable ---
  {
    id: 'suppliers',
    entity: supplierEntity,
    icon: 'Building2',
    description: 'Manage your product and material suppliers',
    display: 'table',
  },
  {
    id: 'product-categories',
    entity: productCategoryEntity,
    icon: 'Tag',
    description: 'Product categories for organization',
    display: 'table',
  },
  {
    id: 'stock-locations',
    entity: stockLocationEntity,
    icon: 'Warehouse',
    description: 'Physical storage locations for inventory',
    display: 'table',
  },
  // --- Read-only (system / seeded) ---
  {
    id: 'measurement-units',
    entity: measurementUnitEntity,
    icon: 'Ruler',
    description: 'Standard units of measure',
    display: 'table',
    readOnly: true,
    seedData: [
      { id: 'mu-unit', name: 'Unit', abbreviation: 'un', isActive: true },
      { id: 'mu-box', name: 'Box', abbreviation: 'box', isActive: true },
      { id: 'mu-kg', name: 'Kilogram', abbreviation: 'kg', isActive: true },
      { id: 'mu-g', name: 'Gram', abbreviation: 'g', isActive: true },
      { id: 'mu-l', name: 'Liter', abbreviation: 'L', isActive: true },
      { id: 'mu-ml', name: 'Milliliter', abbreviation: 'mL', isActive: true },
    ],
  },
]
