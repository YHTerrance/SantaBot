import { kv } from '@vercel/kv'
import { closeDraw } from '../actions'

export async function POST(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Invalid request', { status: 400 })
  }

  const currentTime = new Date().getTime() + 8 * 60 * 60 * 1000 // UTC+8
  let drawsIdToUpdate = []
  let updatedCount = 0

  try {
    // TODO: this is for production: drawsIdToUpdate = await kv.zrange('polls_by_date', currentTime, -1)
    const drawIds = await kv.keys('draw:*')
    drawsIdToUpdate = drawIds.map((id) => id.split('draw:')[1])
    console.log(`Retrieved draws to update: ${drawsIdToUpdate}`)
  } catch (error) {
    console.error('Failed to retrieve draws to update:', error)
    return new Response('Failed to retrieve draws to update', { status: 500 })
  }

  for (const drawId of drawsIdToUpdate) {
    await closeDraw(drawId)
    updatedCount++
  }
  return new Response(`Updated ${updatedCount} draws`, { status: 200 })
}
