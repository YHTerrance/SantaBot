import { publishReply } from '../casts'
import { neynarClient, neynarSigner } from '../neynar'

export async function POST(request: Request) {
  if (
    request.method !== 'POST' ||
    request.headers.get('content-type') !== 'application/json'
  ) {
    return new Response('Invalid request', { status: 400 })
  }

  try {
    const res = await request.json()
    // console.log("Received mention:", res)

    const reply = `🎁 Be a good girl/boy to get a gift from Santa.`

    publishReply(
      `from @${res.data.author.username}`,
      res.data.hash,
      reply,
      undefined,
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
