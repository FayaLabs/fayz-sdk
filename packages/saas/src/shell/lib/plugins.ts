// Shim → native plugin runtime (@fayz-ai/core), so the shell + native WidgetSlot
// share one PluginRuntime context.
export {
  resolvePluginRuntime,
  getWidgetsForZone,
  usePluginRuntime,
  usePluginRuntimeOptional,
  PluginRuntimeProvider,
  definePlugin,
  resolvePluginComponent,
} from '@fayz-ai/core'
