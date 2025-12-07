'use client'

import React from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { toCFUrl } from '@/lib/cfUrl'

interface ImageModalProps {
  src: string
  alt?: string
  isOpen: boolean
  onClose: () => void
}

export default function ImageModal({ src, alt = '', isOpen, onClose }: ImageModalProps) {
  if (!isOpen || typeof window === 'undefined') return null

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center"
      onClick={onClose}
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
        className="relative flex flex-col items-center max-w-[92vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ transform: 'none', zoom: 1 }}
      >
        {/* 拡大画像 */}
        <Image
          src={toCFUrl(src)}
          alt={alt}
          width={800}
          height={600}
          sizes="92vw"
          className="rounded-lg shadow-xl max-w-full max-h-[80vh] object-contain bg-white/5 backdrop-blur-lg p-1"
          style={{ transform: 'none', zoom: 1 }}
        />

        {/* PC表示ではモーダル右上に、スマホでは画像から十分離して表示 */}
        <button
          className="md:absolute md:top-3 md:right-3 w-10 h-10 flex items-center justify-center border-0 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 text-xl font-light cursor-pointer select-none focus:outline-none transition z-50 mt-8 md:mt-0 shadow-md"
          onClick={onClose}
          style={{ transform: 'none', zoom: 1 }}
        >
          ×
        </button>
      </div>
    </div>
  )

  // Try to use modal-root first, fallback to document.body
  const modalRoot = document.getElementById('modal-root')
  return createPortal(modalContent, modalRoot || document.body)
}