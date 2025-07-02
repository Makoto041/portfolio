// イベント時刻を24時以降も「25時・26時…」表記で返すユーティリティ
// startDate, endDate: ISO文字列
// 戻り値: { date: '7月1日', time: '22:00〜25:30' }

export function formatEventDateWithExtendedHour(startDate: string, endDate?: string | null) {
  // JSTでパース
  const start = new Date(new Date(startDate).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const startY = start.getFullYear()
  const startM = start.getMonth() + 1
  const startD = start.getDate()
  const startHour = start.getHours()
  const startMin = start.getMinutes()

  const startDateStr = `${startM}月${startD}日`
  const pad = (n: number) => n.toString().padStart(2, '0')
  const startTimeStr = `${pad(startHour)}:${pad(startMin)}`

  if (endDate) {
    const end = new Date(new Date(endDate).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    // 開始日から終了日までの経過時間（分）
    const diffDay =
      (end.getFullYear() - startY) * 24 * 60 +
      (end.getMonth() - start.getMonth()) * 31 * 60 + // 月またぎは最大値で
      (end.getDate() - startD) * 24 * 60
    const endHourRaw = end.getHours() + end.getMinutes() / 60 + diffDay / 60
    let endHour = endHourRaw
    let endMin = end.getMinutes()
    // 24時以降なら25時、26時…表記
    if (diffDay > 0) {
      endHour = startHour + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      endMin = end.getMinutes()
    }
    const endHourInt = Math.floor(endHour)
    const endMinStr = pad(endMin)
    const endTimeStr = `${pad(endHourInt)}:${endMinStr}`
    return { date: startDateStr, time: `${startTimeStr}〜${endTimeStr}` }
  }

  return { date: startDateStr, time: startTimeStr }
}
