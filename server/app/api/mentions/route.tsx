import { saveDraw } from '../actions';
import { publishReply } from '../casts'
import { neynarClient, neynarSigner } from '../neynar'

// Create a cache to store requests in process
const processedRequests = new Set()

// Schedule a function to clear the cache every hour
setInterval(() => {
  processedRequests.clear();
}, 60 * 60 * 1000); // 60 minutes * 60 seconds * 1000 milliseconds

export async function POST(request: Request) {
  if (
    request.method !== 'POST' ||
    request.headers.get('content-type') !== 'application/json'
  ) {
    return new Response('Invalid request', { status: 400 })
  }

  try {
    const res = await request.json()
    
    const reply = `🎁 Be a good girl/boy to get a gift from Santa.`
    
    const castHash = res.data.hash
    const author = res.data.author.username
    const text = res.data.text
    const timestamp = res.data.timestamp
    
    if (processedRequests.has(castHash)) {
      return new Response('Request already processed', { status: 200 })
    }
    
    console.log("Processing mention:", res)
    processedRequests.add(res.data.hash)

    publishReply(
      `Reply to @${author}`,
      castHash,
      reply,
      undefined,
      undefined,
      neynarSigner
    )
    
    // TODO: Process data from LLM
    // Using Mock data for now
    let draw = {
      id: castHash,
      created_at: timestamp,
      deadline: new Date(new Date(timestamp).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Set deadline to be due in 3 days
      criteria: "like",
      total_awardees: 2,
      token: "USDC",
      total_award: 100,
      awardees: [],
      author: author,
      status: 0, // 0: "open", 1: "closed"
    }

    await saveDraw(draw)
    
    return new Response('Successfully received response and generated reply', {
      status: 200,
    })
  } catch (error) {
    return new Response('Error processing request', { status: 500 })
  }
}
