# 10 — Architecture Visuals

Mermaid diagrams for discussing the Fayz SDK / Fayz Core architecture before implementation.

## 1. Big picture: AI Builder → SDK → Runtime → Customer SaaS

```mermaid
flowchart TB
  User[Customer / Builder / Operator]
  AI[Fayz AI Builder + Coding Agents]
  Manifest[AppManifest JSON\nSDK-owned contract]
  FayzAPI[Fayz API\nmanifest resolver + project runtime APIs]
  Panel[Fayz Editor Panel\nhost-owned UI surface]
  Project[Generated Fayz Project\ncustomer SaaS repo/app]
  Runtime[@fayz/runtime\nmanifest -> app]
  Surfaces[Surfaces\nadmin / storefront / portal / panel]
  Providers[Providers\nSupabase / Fayz API / custom]
  DB[(Customer / Fayz DB)]
  Plugins[Plugins / Modules\nagenda, shop, inventory, financial]

  User --> AI
  AI --> Manifest
  Manifest --> FayzAPI
  FayzAPI --> Panel
  Manifest --> Project
  Project --> Runtime
  Runtime --> Surfaces
  Runtime --> Plugins
  Runtime --> Providers
  Providers --> DB
  Plugins --> Providers

  Panel -. host invariant sections .-> Cloud[Cloud Features\nDeploy / DB / Logs / Settings]
```

Core idea: **manifest is the language**, not the runtime. Fayz, generated projects, plugins, and agents all coordinate through the manifest contract.

## 2. Repo/package responsibility map

```mermaid
flowchart LR
  subgraph SDK[~/dev/fayz-sdk]
    Core[@fayz/core\ncontracts, manifest, data provider, registry, events]
    UI[@fayz/ui\ndesign tokens + primitives]
    Auth[@fayz/auth\nauth adapters/context]
    Saas[@fayz/saas\nadmin SaaS shell + CRUD pages]
    Runtime[@fayz/runtime\nrenderApp / manifest runtime glue]
    Storefront[@fayz/storefront\ncommerce surface shell]
    Shop[@fayz/shop\ncommerce domain primitives]
    Plugins[@fayz/plugin-*\nfeature modules]
    CLI[@fayz/cli\nfuture migration/import tooling]
  end

  subgraph Fayz[~/dev/fayz]
    Api[Fayz API\nprojects, imports, manifest storage, migrations]
    Web[Fayz Web Editor\nPanel tab + builder UI]
    AI2[packages/ai-v2\ngeneration vocabulary + agent guidance]
  end

  subgraph Apps[~/dev/fayz-app]
    Beauty[beauty-saas\nmain vertical proof]
    Resto[resto-saas\nrestaurant proof]
    Tannat[tannat-store\ncommerce proof]
  end

  Core --> Saas
  Core --> Runtime
  Core --> Plugins
  UI --> Saas
  UI --> Storefront
  Shop --> Storefront
  Plugins --> Apps
  Runtime --> Apps
  Api --> Web
  Web --> Runtime
  AI2 --> Core
  Apps -. imported/managed by .-> Api
```

Important separation: `fayz-sdk` owns the **open platform contracts/runtime packages**. `fayz` owns the **builder/editor/backend orchestration**. `fayz-app` holds **real generated/customer-like products**.

## 3. Manifest storage and tenant-specific Panel rendering

```mermaid
sequenceDiagram
  participant Editor as Fayz Editor Panel
  participant API as Fayz API
  participant Store as ProjectAppManifest table
  participant SDK as @fayz/runtime/@fayz/core
  participant Provider as Data Provider
  participant DB as Customer/Fayz DB

  Editor->>API: GET /projects/:projectId/panel-manifest?tenantId=...
  API->>Store: find active manifest binding\nprojectId + tenantId/customerId + env + surface=panel/admin
  Store-->>API: manifest JSON + version + invariant config
  API-->>Editor: AppManifest/SurfaceManifest + Cloud Features
  Editor->>SDK: validateManifest + render selected surface
  SDK->>Provider: resolve data provider from manifest/backend
  Provider->>DB: list/create/update/remove or action calls
  DB-->>Provider: records/results
  Provider-->>SDK: normalized SDK result
  SDK-->>Editor: rendered pages/plugins/widgets
```

Architectural decision I recommend: DB stores **manifest bindings and versions**, not a new competing manifest shape. The SDK `AppManifest` remains canonical.

## 4. Provider abstraction: do not make a god provider

```mermaid
flowchart TB
  Manifest[AppManifest.backend]
  Resolver[Provider Resolver]

  Manifest --> Resolver

  Resolver --> Data[DataProvider\nCRUD/query]
  Resolver --> Actions[ActionProvider\nbusiness actions/RPC]
  Resolver --> Realtime[RealtimeProvider\nsubscriptions later]
  Resolver --> Migration[MigrationProvider\nplan/apply DB changes]
  Resolver --> Files[FileProvider\nstorage later]

  Data --> Supabase[Supabase provider\ndefault/open-source]
  Data --> FayzProvider[Fayz API provider\nfor Fayz-managed projects]
  Data --> Mock[Mock provider\ndev/demo]
  Data --> Custom[Custom provider\ncommunity/enterprise]

  Actions --> FayzProvider
  Migration --> FayzAPI[Fayz API approved migration runner]
```

Pushback: if we put CRUD, auth, realtime, files, migrations, and AI actions into one interface, SDK v1 becomes fragile. Split provider capabilities and implement only what the current phase needs.

## 5. Manifest shape: app → surfaces → pages/plugins

```mermaid
classDiagram
  class AppManifest {
    manifestVersion
    id
    name
    backend
    locale
    theme
    surfaces
    entities
    permissions
    billing
  }

  class SurfaceManifest {
    scaffold
    plugins
    pages
    options
  }

  class PageManifest {
    path
    label
    icon
    section
    blocks
    entity
    component
    permission
  }

  class PluginRef {
    id
    config
    enabled
  }

  class BackendRef {
    provider
    url/projectRef
    custom options
  }

  AppManifest "1" --> "many" SurfaceManifest : surfaces
  SurfaceManifest "1" --> "many" PageManifest : pages
  SurfaceManifest "1" --> "many" PluginRef : plugins
  AppManifest "1" --> "1" BackendRef : backend
```

The Panel should render one surface from the manifest. Later the same manifest can also describe admin/storefront/portal surfaces.

## 6. Plugin/module lifecycle

```mermaid
stateDiagram-v2
  [*] --> Discovered
  Discovered --> Installed: package available + manifest valid
  Installed --> Configured: tenant config saved
  Configured --> Enabled: dependencies satisfied
  Enabled --> Active: runtime resolves routes/widgets/actions
  Active --> Disabled: tenant disables
  Disabled --> Enabled: tenant re-enables
  Active --> UpgradePending: new version available
  UpgradePending --> Active: migration approved + applied
  Active --> Removed: uninstall
  Removed --> [*]
```

This lifecycle is why we need manifest/versioning/migrations early, but not a full marketplace yet.

## 7. Phase order

```mermaid
gantt
  title Fayz SDK inside Fayz — foundation-first execution
  dateFormat  YYYY-MM-DD
  section Contract
  Manifest + provider contract lock       :a1, 2026-06-15, 1d
  section Fayz integration
  DB/API manifest resolver                :a2, after a1, 1d
  Editor Panel rendering                  :a3, after a2, 1d
  section Project generation
  Scaffold SDK into new projects          :a4, after a1, 1d
  Agent guide + migration rules           :a5, after a4, 1d
  section Proof
  Beauty SaaS import/mutation proof       :a6, after a3, 2d
  section Expansion
  Tannat/shop + Cal/Medusa reference      :a7, after a6, 2d
  section Validation
  E2E demo + progress report              :a8, after a6, 1d
```

This is intentionally not “build every module first.” The correct proof is: **one manifest controls one real app surface, per tenant, safely.**

## 8. Governance path: now vs later

```mermaid
flowchart LR
  Now[V1 now\nmanifest validation\nprovider boundaries\nexplicit migrations\nbasic audit hooks]
  Next[V2 next\napproval workflow\nmanifest version history\nrollback\nplugin dependency resolver]
  Later[V3 later\nmarketplace\ncertification\nsandbox\npolicy engine\nrevenue share]

  Now --> Next --> Later
```

Do not skip governance, but also do not build SAP-scale controls before the Panel/Beauty proof works.
