'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import { LocalTime } from '@/components/LocalTime'
import LocalDate from '@/components/LocalDate'
import LikeButton from '@/components/LikeButton'
import RichTextRenderer from '@/components/RichTextRenderer'
import UrlPreview from '@/components/UrlPreview'
import { toCFUrl } from '@/lib/cfUrl'
import type { TimelineDoc } from '@/lib/payloadTypes'

const CARD = 'glass rounded-lg overflow-hidden'

interface TimelineListProps {
  initialTimeline: TimelineDoc[]
}

export default function TimelineList({ initialTimeline }: TimelineListProps) {
  const [modalImg, setModalImg] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<TimelineDoc[]>(initialTimeline)

  // いいね処理の即時反映用ハンドラ
  const handleLikeUpdate = (id: string | number, newLikes: number) => {
    setTimeline((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          return { ...item, likes: newLikes }
        }
        return item
      })
    })
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
      {/* モーダルは全体の一番上で一度だけ表示 */}
      {modalImg && (
        <div
          className="fixed inset-0 bg-black/75 z-[9999] flex items-center justify-center p-4"
          onClick={() => setModalImg(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            transform: 'none',
            zoom: 1
          }}
        >
          <div
            className="relative flex flex-col items-center max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: 'none', zoom: 1 }}
          >
            <Image
              src={toCFUrl(modalImg)}
              alt="timeline-modal-img"
              width={800}
              height={600}
              sizes="90vw"
              className="rounded-lg shadow-xl max-w-full max-h-[80vh] object-contain"
              style={{ transform: 'none', zoom: 1 }}
            />
            <button
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white text-lg cursor-pointer focus:outline-none transition"
              onClick={() => setModalImg(null)}
              style={{ transform: 'none', zoom: 1 }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 日付ごとにグループ化して表示 */}
      <div>
        {sortedDates.map((date) => (
          <div key={date} className="mb-8">
            <div className="text-left text-base font-semibold py-2">
              <LocalDate dateStr={date} formatType="dateOnly" />
            </div>
            <ul className="space-y-4">
              {groups[date].map((t) => (
                <li key={t.id} className={`${CARD} p-4`}>
                  <time className="block text-xs opacity-60 mb-1">
                    <LocalTime dateString={t.publishedAt ?? t.createdAt} />
                  </time>
                  <div className="text-sm leading-relaxed">
                    {t.text ? (
                      <RichTextRenderer data={t.text} />
                    ) : (
                      <span className="text-gray-500 italic">テキストがありません</span>
                    )}
                  </div>

                  {/* URLプレビュー */}
                  {(t.embedUrl || t.urlMetadata) && (
                    <UrlPreview
                      metadata={{
                        title: t.urlMetadata?.title,
                        description: t.urlMetadata?.description,
                        image: t.urlMetadata?.image,
                        siteName: t.urlMetadata?.siteName,
                        url: t.urlMetadata?.url
                      }}
                      embedUrl={t.embedUrl}
                    />
                  )}

                  {/* 画像がある場合のみ余白を追加 */}
                  {t.images?.length ? <div className="h-4"></div> : null}
                  {t.images
                    ?.slice(0, 3)
                    .map((imgObj: any) =>
                      imgObj?.image?.url ? (
                        <Image
                          key={imgObj.id || imgObj.image?.id}
                          src={toCFUrl(imgObj.image.url)}
                          alt="timeline-img"
                          width={128}
                          height={128}
                          sizes="128px"
                          className="w-32 h-32 object-cover rounded mr-2 inline-block cursor-pointer"
                          onClick={() => setModalImg(imgObj.image.url)}
                        />
                      ) : null,
                    )}
                  <LikeButton
                    id={t.id}
                    initialLikes={t.likes ?? 0}
                    onLikeUpdate={handleLikeUpdate}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}
