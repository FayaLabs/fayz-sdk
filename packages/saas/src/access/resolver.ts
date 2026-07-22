// The decision engine moved to @fayz-ai/core/access so the SAME implementation
// runs in the browser, in headless client-plane code and in the Fayz broker
// (server-side agent authorization). Re-exported here so existing call-sites
// keep importing from saas unchanged.
export { isEntitledByPlan, resolveAccess, resolveLimit } from '@fayz-ai/core/access'
