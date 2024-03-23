import { kv } from '@vercel/kv'
import { DRAW_EXPIRY, Draw } from './types'
import { getDateTag } from './utils/getDateTag'

export async function saveDraw(draw: Draw) {
  await kv.hset(`draw:${draw.id}`, draw)
  await kv.expire(`draw:${draw.id}`, DRAW_EXPIRY)
  await kv.zadd('polls_by_date', {
    score: new Date(draw.deadline).getTime(),
    member: draw.id,
  })
  console.log(`${getDateTag()} Draw ${draw.id} saved successfully`)
}

export async function getDrawById(drawId: string): Promise<Draw | null> {
  try {
    const drawData = await kv.hgetall(`draw:${drawId}`)
    if (!drawData || Object.keys(drawData).length === 0) {
      console.error(`Draw with ID ${drawId} not found.`)
      return null
    }
    return drawData as Draw
  } catch (error) {
    console.error(`Error retrieving draw with ID ${drawId}:`, error)
    return null
  }
}

export async function closeDraw(drawId: string) {
  const status = await kv.hget(`draw:${drawId}`, 'status')
  if (status === 0) {
    await kv.hincrby(`draw:${drawId}`, 'status', 1)
    console.log(`${getDateTag()} Draw ${drawId} status updated to closed`)
  } else {
    console.error(`Draw ${drawId} already closed`)
  }
}

export async function deleteDrawById(drawId: string) {
  await kv.del(`draw:${drawId}`)
  await kv.zrem('polls_by_date', drawId)
  console.log(`${getDateTag()} Draw ${drawId} deleted successfully`)
}
