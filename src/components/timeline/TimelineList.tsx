'use client'
import { useState } from 'react'
import LocalDate from '@/components/shared/LocalDate'
import TimelineCard from '@/components/timeline/TimelineCard'
import ImageModal from '@/components/gallery/ImageModal'
import type { TimelineDoc } from '@/lib/payloadTypes'

interface TimelineListProps {
  initialTimeline: TimelineDoc[]
}

export default function TimelineList({ initialTimeline }: TimelineListProps) {
  const [modalImg, setModalImg] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<TimelineDoc[]>(initialTimeline)

  // いいね処理の即時反映用ハンドラ
  const handleLikeUpdate = (id: string | number, newLikes: number) => {
    setTimeline((prev) =>
      prev.map((item) => (item.id === id ? { ...item, likes: newLikes } : item)),
    )
  }

  // 日付ごとにグループ化
  const groups = timeline.reduce<Record<string, TimelineDoc[]>>((acc, doc) => {
    const dateObj = new Date(doc.publishedAt ?? doc.createdAt)
    const dateKey = dateObj.toISOString().slice(0, 10)
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(doc)
    return acc
  }, {})

  // 日付を降順ソート
  const sortedDates = Object.keys(groups).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  )

  return (
    <>
      {/* 画像モーダル */}
      <ImageModal
        src={modalImg ?? ''}
        alt="timeline-modal-img"
        isOpen={!!modalImg}
        onClose={() => setModalImg(null)}
      />

      {/* 日付ごとにグループ化して表示 */}
      <div>
        {sortedDates.map((date) => (
          <section key={date} className="mb-10">
            <h2 className="mb-3 px-1 text-sm font-semibold tracking-wide text-muted">
              <LocalDate dateStr={date} formatType="dateOnly" />
            </h2>
            <ul className="space-y-4">
              {groups[date].map((post) => (
                <li key={post.id}>
                  <TimelineCard
                    post={post}
                    dateMode="time"
                    onImageClick={setModalImg}
                    onLikeUpdate={handleLikeUpdate}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
