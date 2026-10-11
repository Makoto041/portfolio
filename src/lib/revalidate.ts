// src/lib/revalidate.ts
// On-demand ISR: コレクション/グローバル更新時に該当ページを即再検証する。
// 「どの変更 → どのパス」を各コレクションの hooks に集約し、マジックストリングの散在を防ぐ。
// next/cache はローカルAPI/シード/マイグレーション等リクエスト外からの呼び出しで例外になり得るため
// 動的 import + try/catch で無害化する（時間ベースの revalidate=60 がフォールバックとして残る）。
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

export async function revalidate(paths: (string | undefined | null)[]) {
  try {
    const { revalidatePath } = await import('next/cache')
    for (const p of paths) if (p) revalidatePath(p)
  } catch (e) {
    console.warn('[revalidate] skipped (outside request scope):', (e as Error)?.message)
  }
}

/** 静的パス + 任意のドキュメント依存パス（例: /posts/[slug]）を再検証する collection hooks を生成 */
export function makeRevalidate(
  staticPaths: string[],
  dynamicPath?: (doc: Record<string, unknown>) => string | undefined | null,
): { afterChange: [CollectionAfterChangeHook]; afterDelete: [CollectionAfterDeleteHook] } {
  const afterChange: CollectionAfterChangeHook = async ({ doc }) => {
    await revalidate([...staticPaths, dynamicPath?.(doc)])
    return doc
  }
  const afterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
    await revalidate([...staticPaths, dynamicPath?.(doc)])
    return doc
  }
  return { afterChange: [afterChange], afterDelete: [afterDelete] }
}

/**
 * 全ページを再検証する（全ページ共通の外枠＝ヘッダー・フッター・メニューに出る設定値が変わったとき）。
 * ルートのレイアウトごと無効化するので、/letter や 404 のような時間ベースの再検証を持たないページも更新される。
 */
export async function revalidateAllPages() {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
  } catch (e) {
    console.warn('[revalidate] skipped (outside request scope):', (e as Error)?.message)
  }
}
