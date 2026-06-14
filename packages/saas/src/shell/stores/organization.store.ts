// Shim → native org store (unified singleton). The legacy shell + native code
// (plugins, CRUD) now read the same organization store.
export { useOrganizationStore, getPersistedOrgId } from '../../org'
