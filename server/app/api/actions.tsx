import { kv } from '@vercel/kv'
import { DRAW_EXPIRY, Draw } from './types'
import {
  checkIfCastExist,
  getBulkUsers,
  getUsersThatMeetCriteria,
} from './casts'
import { getDateTag } from './utils/getDateTag'
import { publishReply } from './casts'
import { neynarSigner } from './neynar'

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
      console.error(`getDrawById(): Draw with ID ${drawId} not found in kv`)
      return null
    }

    if (!(await checkIfCastExist(drawId))) {
      console.error(`getDrawById(): Cast ${drawId} does not exist on Farcaster`)
      await deleteDrawById(drawId)
      return null
    }

    return drawData as Draw
  } catch (error) {
    console.error(`Error retrieving draw with ID ${drawId}:`, error)
    return null
  }
}

export async function closeDraw(drawId: string) {
  if (typeof drawId !== 'string') {
    console.error(`Invalid drawId type: ${typeof drawId}`)
    return
  }
  let candidates
  let draw
  try {
    draw = await getDrawById(drawId)
    if (!draw) {
      throw new Error(`Draw ${drawId} not found`)
    }
  } catch (error) {
    console.error(`Error retrieving draw ${drawId}:`, error)
    return // Skip to the next drawId in the loop if an error occurs
  }

  // if draw already closed, skip
  if (Number(draw.status) === 1) {
    console.log(`Draw ${drawId} already closed`)
    return
  }

  if (await checkIfCastExist(drawId)) {
    candidates = await getUsersThatMeetCriteria(draw.criteria, drawId)
  } else {
    console.error(`Cast ${drawId} not found`)
    // the cast has been deleted on the platform, delete the draw in kv
    deleteDrawById(drawId)
    return // Skip to the next drawId in the loop if the cast is not found
  }

  console.log(`Retrieved ${candidates.length} candidates for draw ${drawId}`)

  // Randomly select awardees from the candidates
  const awardees: any[] = []
  const totalAwardees = draw.total_awardees
  for (let i = 0; i < totalAwardees; i++) {
    if (candidates.length === 0) {
      break // No more candidates to select
    }
    const randomIndex = Math.floor(Math.random() * candidates.length)

    if (!awardees.includes(candidates[randomIndex])) {
      awardees.push(candidates[randomIndex])
    } else {
      console.log(`Candidate ${candidates[randomIndex]} already selected`)
    }
    candidates.splice(randomIndex, 1) // Remove the selected candidate
  }

  console.log(`Awardees for draw ${drawId}:`, awardees)
  // Save the draw with the updated status
  draw.awardees = awardees
  try {
    await saveDraw(draw)
  } catch (error) {
    console.error(`Failed to save draw ${drawId}:`, error)
    return // Skip to the next drawId in the loop if an error occurs
  }

  const status = await kv.hget(`draw:${drawId}`, 'status')
  if (status === 0) {
    await kv.hincrby(`draw:${drawId}`, 'status', 1)
    console.log(`${getDateTag()} Draw ${drawId} status updated to closed`)
  } else {
    console.error(`Draw ${drawId} already closed`)
  }

  // cast the result

  const frameURL = `${process.env.DEPLOYMENT_BASE_URL}/api/frames/cast/${drawId}`

  let users
  if (awardees.length > 0) {
    users = await getBulkUsers(awardees)
  }
  let reply = 'The draw has been closed. Check the result here.'
  if (users) {
    for (let user of users) {
      reply += `\n@${user.username}`
    }
  }

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

export async function deleteDrawById(drawId: string) {
  await kv.del(`draw:${drawId}`)
  await kv.zrem('polls_by_date', drawId)
  console.log(`${getDateTag()} Draw ${drawId} deleted successfully`)
}
