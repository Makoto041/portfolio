import {} from 'payload'
import path from 'path'
import { Users } from './collections/Users.js'
import { Media } from './collections/Media.js'
import { TimelinePosts } from './collections/TimelinePosts.js'
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'

export default {
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  collections: [Users, Media, TimelinePosts],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql'),
  },
  db: vercelPostgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL,
    },
  }),
  secret: process.env.PAYLOAD_SECRET || '',
}
