/**
 * Resolves the NextAuth secret used to sign/verify session JWTs.
 *
 * In production we must NOT fall back to a known, hardcoded value — a guessable
 * secret would let anyone forge a valid session token and impersonate any user
 * (including admins). The deployment must provide `NEXTAUTH_SECRET`.
 *
 * A clearly-labelled dev-only fallback is used outside of production and during
 * the production *build* phase (static generation does not exercise auth and the
 * real secret is injected at runtime, not build time).
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (secret) return secret

  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
  if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
    throw new Error(
      'NEXTAUTH_SECRET environment variable is required in production. ' +
        'Refusing to start with an insecure default secret.',
    )
  }

  return 'luma-dev-only-insecure-secret-do-not-use-in-production'
}
