'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TimelineDoc } from '@/lib/payloadTypes'
import LocalDate from '@/components/LocalDate'
import LikeButton from '@/components/LikeButton'

type HomeTimelineProps = {
  timelineData: TimelineDoc[]
  cardClass: string
}

export default function HomeTimeline({ timelineData, cardClass }: HomeTimelineProps) {
  const [modalImg, setModalImg] = useState<string|null>(null);
  const [timeline] = useState<TimelineDoc[]>(timelineData)

  return (
    <>
      {/* モーダル表示部分（全体で1つだけ） */}
      {modalImg && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center"
          onClick={() => setModalImg(null)}
        >
          <div className="relative flex flex-col items-center max-w-[92vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={modalImg}
              alt="timeline-modal-img"
              className="rounded-lg max-w-full max-h-[80vh] object-contain bg-white/30 backdrop-blur-sm p-1"
            />
            {/* PC表示ではモーダル右上に、スマホでは画像から十分離して表示 */}
            <button
              className="md:absolute md:top-3 md:right-3 w-10 h-10 flex items-center justify-center border-0 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 text-xl font-light cursor-pointer select-none focus:outline-none transition z-50 mt-8 md:mt-0 shadow-md"
              onClick={() => setModalImg(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* タイムライン部分 */}
      <ul className="space-y-4">
        {timeline.map((t: TimelineDoc) => (
          <li key={t.id} className={`${cardClass} p-4`}>
            <time className="block text-xs opacity-60 mb-1">
              <LocalDate dateStr={t.publishedAt ?? t.createdAt} formatType="auto" />
            </time>
            <p className="text-sm leading-relaxed whitespace-pre-line">{t.text}</p>
            
            {/* 画像がある場合のみ余白を追加 */}
            {t.images?.length ? <div className="h-4"></div> : null}
            
            {/* 画像最大3枚表示 */}
            {t.images?.length ? (
              <div className="flex gap-2">
                {t.images.slice(0, 3).map((imgObj: any) =>
                  imgObj?.image?.url ? (
                    <img
                      key={imgObj.id || imgObj.image?.id}
                      src={imgObj.image.url}
                      alt="timeline-img"
                      className="w-32 h-32 object-cover rounded cursor-pointer"
                      onClick={() => setModalImg(imgObj.image.url)}
                    />
                  ) : null,
                )}
              </div>
            ) : null}

            {/* いいね機能 */}
            <LikeButton 
              id={t.id} 
              initialLikes={t.likes ?? 0} 
            />
          </li>
        ))}
      </ul>
    </>
  )
}
