'use client'

import { useState } from 'react'
import { TimelineDoc } from '@/lib/payloadTypes'
import TimelineCard from '@/components/timeline/TimelineCard'
import ImageModal from '@/components/gallery/ImageModal'

type HomeTimelineProps = {
  timelineData: TimelineDoc[]
}

export default function HomeTimeline({ timelineData }: HomeTimelineProps) {
  const [modalImg, setModalImg] = useState<string | null>(null)

  return (
    <>
      {/* 画像モーダル */}
      <ImageModal
        src={modalImg ?? ''}
        alt="timeline-modal-img"
        isOpen={!!modalImg}
        onClose={() => setModalImg(null)}
      />

      {/* タイムライン */}
      <ul className="space-y-4">
        {timelineData.map((post) => (
          <li key={post.id}>
            <TimelineCard
              post={post}
              dateMode="date"
              clampLines={6}
              onImageClick={setModalImg}
            />
          </li>
        ))}
      </ul>
    </>
  )
}
