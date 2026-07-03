export {
  createAuthPlugin,
  createAuthRuntime,
  resolveAuthAdapter,
} from './runtime'
export {
  AuthGate,
  LoginPage,
  AuthCallbackPage,
  ResetPasswordPage,
} from './pages'
export type {
  AuthCallbackPageProps,
  AuthGateProps,
  LoginPageProps,
  ResetPasswordPageProps,
} from './pages'
export {
  LoginForm,
  SignupForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  OAuthButtons,
} from './forms'
export type {
  ForgotPasswordFormProps,
  LoginFormProps,
  OAuthButtonsProps,
  ResetPasswordFormProps,
  SignupFormProps,
} from './forms'
export {
  createMockAuthAdapter,
  createSupabaseAuthAdapter,
  AuthProvider,
  useAuth,
  useAuthStore,
} from '@fayz-ai/auth'
export type {
  AuthPluginOptions,
  ResolvedAuthPlugin,
  AuthRoutesConfig,
  AuthOAuthConfig,
  AuthSupabaseConfig,
  AuthProviderKey,
  AuthLayout,
  AuthFormView,
} from './types'
export type { AuthAdapter, AuthSession, AuthUser, AuthProvider as OAuthProvider } from '@fayz-ai/core'
