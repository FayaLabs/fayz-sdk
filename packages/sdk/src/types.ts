export type FayzRuntimeEnvironment = 'preview' | 'production'

export interface FayzUser {
  id: string
  email?: string | null
  name?: string | null
  avatarUrl?: string | null
  isGuest?: boolean
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

export interface FayzAuthMeResponse {
  user: FayzUser
  impersonation?: unknown
}

export interface FayzApiErrorBody {
  message?: string
  error?: string
  code?: string
  [key: string]: unknown
}

export interface FayzAppParams {
  appId?: string
  apiBaseUrl: string
  token?: string
  projectId?: string
  environment: FayzRuntimeEnvironment
}

export interface AppManifest {
  manifestVersion: number
  id: string
  name: string
  backend?: { provider?: string; [key: string]: unknown }
  locale?: Record<string, unknown>
  theme?: Record<string, unknown>
  permissions?: Record<string, unknown>
  billing?: Record<string, unknown>
  entities?: unknown[]
  surfaces?: Record<string, SurfaceManifest>
  [key: string]: unknown
}

export interface SurfaceManifest {
  scaffold: string
  options?: Record<string, unknown>
  plugins?: PluginRef[]
  pages?: PageManifest[]
  [key: string]: unknown
}

export interface PluginRef {
  id: string
  config?: Record<string, unknown>
}

export interface PageManifest {
  path: string
  label?: string
  component?: string
  blocks?: unknown[]
  [key: string]: unknown
}
