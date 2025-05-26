import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: false,
})

export async function POST(req: NextRequest) {
  const { name, message } = await req.json()

  if (!name || !message) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    await pool.query('INSERT INTO letter (name, message) VALUES ($1, $2)', [
      name,
      message,
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
