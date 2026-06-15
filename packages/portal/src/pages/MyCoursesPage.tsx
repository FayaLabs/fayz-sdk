import React, { useState } from 'react'
import { useMyCourses } from '@fayz-ai/courses'
import { useMemberSession } from '../session'
import { establishMemberSession } from '../auth'
import { useMemberConfig } from '../config'
import { navigateTo } from '../router'

function AuthForm() {
  const config = useMemberConfig()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) return
    setBusy(true)
    try {
      await establishMemberSession(email, { password })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-border bg-card p-7 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground">{config.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Entre para acessar seus cursos.</p>
      <form className="mt-5 space-y-3" onSubmit={submit}>
        <input
          data-testid="member-email"
          type="email"
          required
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
        />
        <input
          data-testid="member-password"
          type="password"
          required
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm"
        />
        {error && <p data-testid="member-auth-error" className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          data-testid="member-signin"
          disabled={busy}
          className="w-full rounded-md bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export function MyCoursesPage() {
  const session = useMemberSession()
  const { courses, loading } = useMyCourses(session.customerId)

  if (!session.customerId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <AuthForm />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">Meus cursos</h1>
      <p className="mb-6 text-sm text-muted-foreground">{session.email}</p>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando…</div>
      ) : courses.length === 0 ? (
        <div data-testid="member-empty" className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
          Você ainda não tem cursos.
        </div>
      ) : (
        <div data-testid="member-courses" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map(({ course, progressPercent, completedLessons, totalLessons }) => (
            <button
              key={course.id}
              data-testid="member-course-card"
              data-slug={course.slug}
              onClick={() => navigateTo(`/course/${course.slug}`)}
              className="group overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary hover:shadow-md"
            >
              <div className="aspect-video w-full overflow-hidden bg-muted">
                {course.thumbnailUrl && <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="space-y-2 p-4">
                <h3 className="font-semibold text-foreground line-clamp-2">{course.title}</h3>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {completedLessons}/{totalLessons} aulas · {progressPercent}%
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
