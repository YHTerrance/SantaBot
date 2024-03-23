import { saveDraw } from '../actions'
import { publishReply } from '../casts'
import { neynarClient, neynarSigner } from '../neynar'
import { parseUserInputWithGPT } from '../utils/parseUserInputWithGPT'

// Create a cache to store requests in process
const processedRequests = new Set()

// Schedule a function to clear the cache every hour
setInterval(
  () => {
    processedRequests.clear()
  },
  60 * 60 * 1000
) // 60 minutes * 60 seconds * 1000 milliseconds

export async function POST(request: Request) {
  if (
    request.method !== 'POST' ||
    request.headers.get('content-type') !== 'application/json'
  ) {
    return new Response('Invalid request', { status: 400 })
  }

  try {
    const res = await request.json()

    const castHash = res.data.hash
    const author = res.data.author.username
    const text = res.data.text
    const timestamp = res.data.timestamp

    if (processedRequests.has(castHash)) {
      return new Response('Request already processed', { status: 200 })
    }

    console.log('Processing mention:', res)
    processedRequests.add(res.data.hash)

    // parse the user input with GPT
    const parsedResponse = await parseUserInputWithGPT(text)
    if (parsedResponse === null) {
      console.log('Failed to parse response')
      return new Response('Failed to parse response', { status: 500 })
    }

    const parsedResponseObj = JSON.parse(parsedResponse)

    console.log('Parsed response object:', parsedResponseObj)

    const missingOrInvalidFields = []
    if (
      parsedResponseObj.deadline === 'missing' ||
      parsedResponseObj.deadline === 'invalid'
    ) {
      missingOrInvalidFields.push(`deadline: ${parsedResponseObj.deadline}`)
    }
    if (
      parsedResponseObj.criteria === 'missing' ||
      parsedResponseObj.criteria === 'invalid'
    ) {
      missingOrInvalidFields.push(`criteria: ${parsedResponseObj.criteria}`)
    }
    if (
      parsedResponseObj.total_awardees === 'missing' ||
      parsedResponseObj.total_awardees === 'invalid'
    ) {
      missingOrInvalidFields.push(
        `total_awardees: ${parsedResponseObj.total_awardees}`
      )
    }
    if (
      parsedResponseObj.total_award === 'missing' ||
      parsedResponseObj.total_award === 'invalid'
    ) {
      missingOrInvalidFields.push(
        `total_award: ${parsedResponseObj.total_award}`
      )
    }
    if (
      parsedResponseObj.token === 'missing' ||
      parsedResponseObj.token === 'invalid'
    ) {
      missingOrInvalidFields.push(`token: ${parsedResponseObj.token}`)
    }
    console.log('missingOrInvalidFields:', missingOrInvalidFields)
    if (missingOrInvalidFields.length > 0) {
      const reply = `The following fields are missing or invalid: ${missingOrInvalidFields.join(', ')}.`
      publishReply(
        `Reply to @${author}`,
        castHash,
        reply,
        undefined,
        undefined,
        neynarSigner
      )
      return new Response(
        'Missing or invalid fields in response. Reply sent to author.',
        {
          status: 201,
        }
      )
    } else {
      // integrate the parsed response to create a draw
      const draw = {
        id: castHash,
        created_at: timestamp,
        deadline: parsedResponseObj.deadline,
        criteria: parsedResponseObj.criteria,
        total_awardees: parsedResponseObj.total_awardees,
        token: parsedResponseObj.token,
        total_award: parsedResponseObj.total_award,
        awardees: [],
        author: author,
        status: 0, // 0: "open", 1: "closed"
      }

      try {
        await saveDraw(draw)
      } catch (error) {
        console.error('Failed to save draw:', error)
        throw new Error('Failed to save draw')
      }
      console.log('Draw saved:', draw)
    }

    const baseURL = `${process.env.VERCEL_URL || 'https://santa-bot-ten.vercel.app'}/api`
    const frameURL = `${baseURL}/frames/cast/${castHash}`

    const reply = `🎁 🎁 Successfully received response and generated draw.`

    publishReply(
      `Reply to @${author}`,
      castHash,
      reply,
      frameURL,
      undefined,
      neynarSigner
    )
    return new Response('Successfully received response and generated reply', {
      status: 200,
    })
  } catch (error) {
    return new Response('Error processing request', { status: 500 })
  }
}
