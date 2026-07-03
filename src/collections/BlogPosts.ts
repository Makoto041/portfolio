import { CollectionConfig } from 'payload'
import { anyone, adminOnly } from '@/lib/access'

export const BlogPosts: CollectionConfig = {
  slug: 'blogPosts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', 'author'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      required: true,
      hooks: {
        beforeValidate: [
          ({ data }) => {
            // Auto‑generate slug from title if empty
            if (data && !data.slug && data.title)
              data.slug = data.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '')
          },
        ],
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'blogMedia',
    },
    {
      name: 'publishedAt',
      type: 'date',
      defaultValue: () => new Date(),
      admin: {
        position: 'sidebar',
      },
    },
  ],
  access: {
    read: anyone,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
}
