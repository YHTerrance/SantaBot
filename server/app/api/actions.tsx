import { kv } from '@vercel/kv'
import { DRAW_EXPIRY, Draw } from './types'
import { getDateTag } from './utils/getDateTag'

export async function saveDraw(draw: Draw) {
  await kv.hset(`draw:${draw.id}`, draw)
  await kv.expire(`draw:${draw.id}`, DRAW_EXPIRY)
  await kv.zadd("polls_by_date", {
    score: Number(draw.deadline),
    member: draw.id
  })
  console.log(
    `${getDateTag()} Draw ${draw.id} saved successfully`
  )
}

