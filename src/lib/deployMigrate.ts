// src/lib/deployMigrate.ts
// 本番デプロイのビルドで DB マイグレーションを自動で適用するときの判定（scripts/migrate-on-deploy.ts から使う）。

export type MigrateDecision =
  | { run: true }
  | { run: false; reason: string; fail: boolean }

/**
 * このビルドで適用するか。Vercel の Production のビルドだけで適用し、Preview・development のビルドでは何もしない。
 * VERCEL_ENV が無い・知らない値のときは、本番かどうか分からないので止める（黙って飛ばさない）。
 * Vercel の「System Environment Variables を公開する」設定が切れていると VERCEL も VERCEL_ENV も無くなるため、
 * 「Vercel の外」とみなして飛ばすことはしない（scripts/migrate-on-deploy.ts は Vercel のビルドコマンドからだけ呼ぶ）
 */
export function migrateDecision(env: Record<string, string | undefined>): MigrateDecision {
  const target = env.VERCEL_ENV
  if (target === 'production') return { run: true }
  if (target === 'preview' || target === 'development') {
    return { run: false, reason: `VERCEL_ENV=${target}`, fail: false }
  }
  return {
    run: false,
    reason: target
      ? `unknown VERCEL_ENV=${target}, so this build cannot tell whether it is production.`
      : 'VERCEL_ENV is not set, so this build cannot tell whether it is production. ' +
        'Turn on "Automatically expose System Environment Variables" in the Vercel project settings ' +
        '(to skip on purpose, set VERCEL_ENV=preview).',
    fail: true,
  }
}

/**
 * まだ適用していないマイグレーションの名前。dev mode の記録（batch -1）だけは適用済みに数えない。
 * それ以外は batch が空でも適用済みとみなす（Payload の migrate も名前が記録にあれば飛ばすので、それに揃える）
 */
export function pendingMigrations(
  names: readonly string[],
  recorded: ReadonlyArray<{ name?: string | null; batch?: number | null }>,
): string[] {
  const ran = new Set(recorded.filter((m) => Number(m.batch) !== -1).map((m) => m.name))
  return names.filter((name) => !ran.has(name))
}

/** dev mode でスキーマを直接書き換えた記録（batch -1）があるか */
export function hasDevPush(recorded: ReadonlyArray<{ batch?: number | null }>): boolean {
  return recorded.some((m) => Number(m.batch) === -1)
}
