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

export async function updateDrawStatus(drawId: string) {
  const status = await kv.hget(`draw:${drawId}`, 'status')
  if (status === 0) {
    await kv.hincrby(`draw:${drawId}`, 'status', 1)
    console.log(`${getDateTag()} Draw ${drawId} status updated to closed`)
  }
}
