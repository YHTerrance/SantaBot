import { kv } from '@vercel/kv'
import { getDrawById, saveDraw, closeDraw, deleteDrawById } from '../actions'
import { checkIfCastExist, getUsersThatMeetCriteria } from '../casts'

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
    if (typeof drawId !== 'string') {
      console.error(`Invalid drawId type: ${typeof drawId}`)
      continue
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
      continue // Skip to the next drawId in the loop if an error occurs
    }

    // if draw already closed, skip
    if (Number(draw.status) === 1) {
      console.log(`Draw ${drawId} already closed`)
      continue
    }

    if (await checkIfCastExist(drawId)) {
      candidates = await getUsersThatMeetCriteria(draw.criteria, drawId)
    } else {
      console.error(`Cast ${drawId} not found`)
      // the cast has been deleted on the platform, delete the draw in kv
      deleteDrawById(drawId)
      continue // Skip to the next drawId in the loop if the cast is not found
    }

    console.log(`Retrieved ${candidates.length} candidates for draw ${drawId}`)

    // Randomly select awardees from the candidates
    const awardees = []
    const totalAwards = draw.total_award
    for (let i = 0; i < totalAwards; i++) {
      if (candidates.length === 0) {
        break // No more candidates to select
      }
      const randomIndex = Math.floor(Math.random() * candidates.length)
      awardees.push(candidates[randomIndex])
      if (!draw.awardees.includes(candidates[randomIndex])) {
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
      continue // Skip to the next drawId in the loop if an error occurs
    }

    await closeDraw(drawId)
    updatedCount++
  }
  return new Response(`Updated ${updatedCount} draws`, { status: 200 })
}
