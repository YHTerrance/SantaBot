import { kv } from '@vercel/kv'
import { getDrawById, saveDraw, closeDraw, deleteDrawById } from '../actions'
import { checkIfCastExist, getUsersThatMeetCriteria } from '../casts'
import { publishReply } from '../casts'
import { neynarSigner } from '../neynar'

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

    // cast the result
    const baseURL = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `https://santa-bot-ten.vercel.app`

    const frameURL = `${baseURL}/api/frames/cast/${drawId}`

    const reply = `The draw has been closed. Check the result here.`

    await publishReply(
      `Reply to @${draw.author}`,
      drawId,
      reply,
      frameURL,
      undefined,
      neynarSigner
    )

    console.log(`Draw ${drawId} published successfully`)
  }
  return new Response(`Updated ${updatedCount} draws`, { status: 200 })
}
