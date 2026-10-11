// src/lib/deployMigrate.ts
// 本番デプロイのビルドで DB マイグレーションを自動で適用するときの判定（scripts/migrate-on-deploy.ts から使う）。

export type MigrateDecision =
  | { run: true }
  | { run: false; reason: string; fail: boolean }

/**
 * このビルドで適用するか。Vercel の Production のビルドだけで適用し、Preview・ローカルのビルドでは何もしない。
 * Vercel 上なのに VERCEL_ENV が無いときは、本番かどうか分からないので止める（黙って飛ばさない）
 */
export function migrateDecision(env: Record<string, string | undefined>): MigrateDecision {
  if (!env.VERCEL) return { run: false, reason: 'not on Vercel', fail: false }
  if (env.VERCEL_ENV === 'production') return { run: true }
  if (env.VERCEL_ENV) return { run: false, reason: `VERCEL_ENV=${env.VERCEL_ENV}`, fail: false }
  return {
    run: false,
    reason:
      'VERCEL_ENV is not set, so this build cannot tell whether it is production. ' +
      'Turn on "Automatically expose System Environment Variables" in the Vercel project settings.',
    fail: true,
  }
}

/** まだ適用していないマイグレーションの名前（dev mode の記録 batch -1 は適用済みに数えない） */
export function pendingMigrations(
  names: readonly string[],
  recorded: ReadonlyArray<{ name?: string | null; batch?: number | null }>,
): string[] {
  const ran = new Set(recorded.filter((m) => Number(m.batch) > 0).map((m) => m.name))
  return names.filter((name) => !ran.has(name))
}

/** dev mode でスキーマを直接書き換えた記録（batch -1）があるか */
export function hasDevPush(recorded: ReadonlyArray<{ batch?: number | null }>): boolean {
  return recorded.some((m) => Number(m.batch) === -1)
}
