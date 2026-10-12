// src/lib/quickpost/dbErrors.ts
// DB の書き込みが一意制約で断られたかを、例外の形から見分ける（純粋な関数。単体テストあり）。

/**
 * 一意制約（unique）で断られた書き込みか。Payload は Postgres の一意制約違反を、項目名つきの
 * ValidationError（status 400、data.errors[].path に項目名）に変えて投げる。
 * クラスの照合（instanceof）はバンドルでクラスが二重になると外れるので、形（status と errors[].path）で見る。
 * DB の障害などはこの形にならないので false（呼び出し側でそのまま 500 にする）。
 * 項目名は Payload が索引の名前から引く。Payload を上げたときは、一意制約の違反がまだこの形で届くかを確かめる
 */
export function isUniqueViolation(e: unknown, field: string): boolean {
  if (typeof e !== 'object' || e === null) return false
  const { status, data } = e as { status?: unknown; data?: { errors?: unknown } | null }
  if (status !== 400) return false
  const errors = data?.errors
  return (
    Array.isArray(errors) && errors.some((x) => (x as { path?: unknown } | null)?.path === field)
  )
}
