// src/collections/Events.ts
import type { CollectionConfig } from 'payload'
import { anyone, adminOnly } from '@/lib/access'
import { makeRevalidate } from '@/lib/revalidate'

export const Events: CollectionConfig = {
  slug: 'events',
  labels: {
    singular: 'イベント',
    plural: 'イベント',
  },
  admin: { useAsTitle: 'title' },
  access: {
    read: anyone,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  // イベント更新で Home（Events カード）とイベント一覧を再検証
  hooks: makeRevalidate(['/', '/events']),
  fields: [
    { name: 'title', type: 'text', required: true, label: 'タイトル' },
    { name: 'summary', type: 'textarea', label: '概要' },
    {
      name: 'platform', // Twitch / YouTube など
      type: 'select',
      defaultValue: 'twitch',
      options: [
        { label: 'Twitch', value: 'twitch' },
        { label: 'YouTube', value: 'youtube' },
        { label: 'ニコニコ', value: 'nico' },
        { label: '現地イベント', value: 'offline' },
        { label: 'その他', value: 'other' },
      ],
    },
    { name: 'externalUrl', type: 'text', label: '配信 URL' },
    { 
      name: 'startDate', 
      type: 'date', 
      required: true, 
      label: '開始日時',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    { 
      name: 'endDate', 
      type: 'date', 
      label: '終了日時(任意)',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    { name: 'thumbnail', type: 'upload', relationTo: 'media', label: 'サムネ' },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'isPublic', type: 'checkbox', defaultValue: true, label: '公開' },
  ],
}
