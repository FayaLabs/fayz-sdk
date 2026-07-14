import { createCrudPage } from '../../../crud/createCrudPage'
import type { EntityDef } from '../../types/crud'

export const locationEntityDef: EntityDef = {
  name: 'Location',
  namePlural: 'Locations',
  icon: 'MapPin',
  layout: 'location',
  displayField: 'name',
  subtitleField: 'city',
  defaultSort: 'name',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true, searchable: true },
    { key: 'phone', label: 'Phone', type: 'phone', showInTable: true },
    { key: 'city', label: 'City', type: 'text', showInTable: true },
    { key: 'state', label: 'State', type: 'text', showInTable: true },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'country', label: 'Country', type: 'text', defaultValue: 'BR' },
    { key: 'postalCode', label: 'Postal Code', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'isHeadquarters', label: 'Headquarters', type: 'boolean', showInTable: true },
    { key: 'isActive', label: 'Active', type: 'boolean', showInTable: true, defaultValue: true, inlineToggle: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  data: {
    table: 'locations',
    tenantScoped: true,
    searchColumns: ['name', 'city', 'state'],
    defaults: { kind: 'branch' },
  },
}

export const LocationsCrudPage = createCrudPage(locationEntityDef)
// Set basePath for hash-based sub-routing inside settings tab
;(LocationsCrudPage as any).__crudBasePath = '/settings/locations'
