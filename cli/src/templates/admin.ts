import {
  type AppTemplate,
  titleCase,
  viteConfig,
  tsconfig,
  postcssConfig,
  tailwindConfig,
  stylesCss,
  indexHtml,
  gitignore,
  mainTsx,
  registryTsx,
  readme,
  claudeMd,
  SHARED_EXTERNAL_DEPS,
} from './shared.js'

// Admin/SaaS app — beauty-saas is the shape reference: a FayzAppConfig source
// of truth passed through defineSaas + renderApp. No supabaseUrl → auth, org
// and every plugin provider fall back to mock; the shell boots with no env.

const CHECKLIST = `1. **Vertical → plugins**: pick the plugin set for the business (e.g. beauty:
   agenda+crm+financial+inventory+forms+tasks+marketing; food: menu+orders+
   inventory; services: agenda+crm+financial). Add each \`@fayz-ai/plugin-*\`
   dep and its \`create*Plugin()\` call to \`src/config/app.tsx\` plugins array.
2. **Plugin options to real depth** (beauty-saas src/config/app.tsx is the bar):
   statuses with labels/colors, entity lookups, module flags, nav positions.
3. **Identity**: theme (\`brand\` HSL shorthand or full colors), logo, shell
   \`layout: 'sidebar' | 'topbar' | 'minimal'\` (default sidebar; \`bottomNav\`/
   \`mobileHeader\` for mobile), locale pt-BR with translations for custom strings.
4. **Dashboard**: configure createDashboardPlugin widgets/KPIs for the vertical.
5. **Manifest**: mirror plugins/theme/locale into \`app.manifest.json\`
   (\`surfaces.admin.plugins: [{ id }]\`).`

function appConfigTsx(name: string): string {
  const title = titleCase(name)
  return `import type { FayzAppConfig } from '@fayz-ai/saas'
import { createDashboardPlugin } from '@fayz-ai/plugin-dashboard'

// Source of truth for this app (the manifest is derived from it). No
// supabaseUrl configured → the shell runs on mock auth/org/data providers.
// Add the vertical's plugins here (see CLAUDE.md checklist).
export const appConfig: FayzAppConfig = {
  name: '${title}',
  locale: { default: 'pt-BR', supported: ['pt-BR'] },
  theme: { brand: '262 60% 50%' },
  plugins: [createDashboardPlugin()],
}
`
}

function appTsx(): string {
  return `import { renderApp, defineSaas } from '@fayz-ai/saas'
import { appConfig } from './config/app'

const manifest = defineSaas(appConfig)

export function App() {
  return renderApp(manifest, { surface: 'admin' })
}
`
}

function pluginsGenerated(): string {
  return `// AI-BUILDER contract file: plugin/scaffold/provider wiring lives here.
// Plugins are code-configured in src/config/app.tsx (the source of truth);
// importing @fayz-ai/saas there self-registers the 'admin' scaffold.
//
// To go fullstack later, initialize the Supabase boundary here, gated on env:
//
//   import { createFayzSupabaseClient } from '@fayz-ai/saas'
//   if (import.meta.env.VITE_USE_SUPABASE === 'true') {
//     createFayzSupabaseClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
//   }
export {}
`
}

function manifest(name: string): string {
  return (
    JSON.stringify(
      {
        manifestVersion: 2,
        id: name,
        name: titleCase(name),
        backend: { provider: 'mock' },
        locale: { default: 'pt-BR', supported: ['pt-BR'] },
        theme: { brand: '262 60% 50%' },
        surfaces: {
          admin: { scaffold: 'admin', plugins: [{ id: 'dashboard' }], pages: [] },
        },
      },
      null,
      2,
    ) + '\n'
  )
}

export const adminTemplate: AppTemplate = {
  kind: 'admin',
  port: 5180,
  fayzDependencies: ['@fayz-ai/sdk', '@fayz-ai/core', '@fayz-ai/saas', '@fayz-ai/ui', '@fayz-ai/plugin-dashboard'],
  externalDependencies: {
    ...SHARED_EXTERNAL_DEPS,
    'react-router-dom': '^6.26.0',
  },
  checklist: CHECKLIST,
  files: (name) => ({
    'app.manifest.json': manifest(name),
    'index.html': indexHtml(titleCase(name)),
    '.gitignore': gitignore(),
    'vite.config.ts': viteConfig(5180),
    'tsconfig.json': tsconfig(),
    'postcss.config.js': postcssConfig(),
    'tailwind.config.ts': tailwindConfig(),
    'README.md': readme(name, 'admin'),
    'CLAUDE.md': claudeMd(name, 'admin', CHECKLIST),
    'src/styles.css': stylesCss(),
    'src/main.tsx': mainTsx({
      beforeRender: `import { setCurrentLocale } from '@fayz-ai/saas'

// Sync @fayz-ai/core's locale so native plugins render in pt-BR.
setCurrentLocale('pt-BR')
`,
    }),
    'src/App.tsx': appTsx(),
    'src/config/app.tsx': appConfigTsx(name),
    'src/plugins.generated.ts': pluginsGenerated(),
    'src/registry.tsx': registryTsx(),
  }),
}
