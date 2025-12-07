'use client'

import { useState } from 'react'
import Image from 'next/image'
import { TimelineDoc } from '@/lib/payloadTypes'
import LocalDate from '@/components/shared/LocalDate'
import LikeButton from '@/components/timeline/LikeButton'
import RichTextRenderer from '@/components/shared/RichTextRenderer'
import { toCFUrl } from '@/lib/cfUrl'

type TimelineFeedProps = {
  timelineData: TimelineDoc[]
  cardClass: string
}

export default function TimelineFeedClient({ timelineData, cardClass }: TimelineFeedProps) {
  const [modalImg, setModalImg] = useState<string|null>(null);
  // クライアントコンポーネント内でタイムラインデータをステート管理
  const [timeline, setTimeline] = useState<TimelineDoc[]>(timelineData)
  
  // いいねボタン押下時のイベントハンドラ
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
  
  return (
    <ul className="space-y-4">
      {timeline.map((t: TimelineDoc) => (
        <li key={t.id} className={`${cardClass} p-4`}>
          <time className="block text-xs opacity-60 mb-1">
            <LocalDate dateStr={t.publishedAt ?? t.createdAt} formatType="auto" />
          </time>
          <div className="text-sm leading-relaxed">
            {t.text ? (
              <RichTextRenderer data={t.text} />
            ) : (
              <span className="text-gray-500 italic">テキストがありません</span>
            )}
          </div>
          {/* 画像がある場合のみ余白を追加 */}
          {t.images?.length ? <div className="h-4"></div> : null}
          {/* 画像最大3枚表示 */}
          {t.images?.length ? (
  <div className="flex gap-2">
    {t.images.slice(0, 3).map((imgObj: any) =>
      imgObj?.image?.url ? (
        <Image
          key={imgObj.id || imgObj.image?.id}
          src={toCFUrl(imgObj.image.sizes?.thumbnail?.url ?? imgObj.image.url)}
          alt="timeline-img"
          width={128}
          height={128}
          sizes="128px"
          className="w-32 h-32 object-cover rounded cursor-pointer"
          onClick={() => setModalImg(imgObj.image.url)}
        />
      ) : null,
    )}
  </div>
) : null}

{/* モーダル表示 */}
{modalImg && (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center"
    onClick={() => setModalImg(null)}
  >
    <div className="relative flex flex-col items-center max-w-[92vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
      <Image
        src={toCFUrl(modalImg)}
        alt="timeline-modal-img"
        width={800}
        height={600}
        sizes="92vw"
        className="rounded-lg shadow-xl max-w-full max-h-[80vh] object-contain bg-white/5 backdrop-blur-lg p-1"
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

          {/* いいね機能 - 即時反映対応 */}
          <LikeButton 
            id={t.id} 
            initialLikes={t.likes ?? 0} 
            onLikeUpdate={handleLikeUpdate}
          />
        </li>
      ))}
    </ul>
  )
}
