import { get } from 'http'
import { saveDraw } from '../actions'
import { publishReply } from '../casts'
import { neynarClient, neynarSigner } from '../neynar'
import { getDateTag } from '../utils/getDateTag'
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
    const req = await request.json()

    const castHash = req.data.hash
    const author = req.data.author.username
    const authorFid = req.data.author.fid
    const text = req.data.text
    const timestamp = req.data.timestamp

    if (processedRequests.has(castHash)) {
      console.log('Request already processed')
      return new Response('Request already processed', { status: 200 })
    }

    console.log(`${getDateTag()} Processing mention by ${author}`)
    processedRequests.add(req.data.hash)

    // parse the user input with GPT
    const parsedResponse = await parseUserInputWithGPT(text)

    if (parsedResponse === null) {
      console.log('Failed to parse response')
      return new Response('Failed to parse response', { status: 500 })
    }

    let parsedResponseObj
    try {
      parsedResponseObj = JSON.parse(parsedResponse)
    } catch (error) {
      console.error('Failed to parse JSON:', error)
      return new Response('Internal Server Error', { status: 500 })
    }

    console.log(`${getDateTag()} Parsed response object:`, parsedResponseObj)

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

    if (missingOrInvalidFields.length > 0) {
      console.log(
        `${getDateTag()} missingOrInvalidFields:`,
        missingOrInvalidFields
      )

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
        author_fid: authorFid,
        status: 0, // 0: "open", 1: "closed"
      }

      try {
        await saveDraw(draw)
      } catch (error) {
        console.error('Failed to save draw:', error)
        throw new Error('Failed to save draw')
      }
      console.log(`${getDateTag()} Saved Draw:`, draw.id)
    }

    const frameURL = `${process.env.DEPLOYMENT_BASE_URL}/api/frames/cast/${castHash}`
    const reply = `🎁 🎁 Successfully received response and generated draw.`

    await publishReply(
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
