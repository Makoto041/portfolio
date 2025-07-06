'use client'

import React from 'react'
import Image from 'next/image'
import { createPortal } from 'react-dom'

interface ImageModalProps {
  src: string
  alt: string
  width?: number
  height?: number
  isOpen: boolean
  onClose: () => void
}

export default function ImageModal({ src, alt, width, height, isOpen, onClose }: ImageModalProps) {
  if (!isOpen || typeof window === 'undefined') return null

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        zIndex: 9999
      }}
    >
      <div 
        className="relative max-w-[90vw] max-h-[90vh] overflow-hidden rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-8 h-8 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 transition-all"
        >
          ✕
        </button>
        <Image
          src={src}
          alt={alt}
          width={width || 1200}
          height={height || 800}
          className="max-w-full max-h-full object-contain"
          sizes="90vw"
        />
      </div>
    </div>
  )

  // Try to use modal-root first, fallback to document.body
  const modalRoot = document.getElementById('modal-root')
  return createPortal(modalContent, modalRoot || document.body)
}