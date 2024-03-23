/** @jsxImportSource frog/jsx */

import { kv } from '@vercel/kv'
import { Button, Frog, TextInput } from 'frog'
import { devtools } from 'frog/dev'
import { neynar as neynarHub } from 'frog/hubs'
import { neynar } from 'frog/middlewares'
import { handle } from 'frog/next'
import { serveStatic } from 'frog/serve-static'
import { checkUserMeetCriteria } from '../../casts'
import { Draw } from '../../types'

const app = new Frog({
  assetsPath: '/',
  basePath: '/api/frames',
  // Supply a Hub to enable frame verification.
  // hub: neynarHub({ apiKey: process.env.NEYNAR_API_KEY || '' })
})

// Uncomment to use Edge Runtime
// export const runtime = 'edge'

app.frame('/cast/:hash', async (c) => {
  const { status, frameData } = c
  const { castId, fid, messageHash, network, timestamp, url } = frameData

  console.log('status', status)
  console.log('castId:', castId)
  console.log('fid:', fid)
  console.log('messageHash:', messageHash)
  console.log('network:', network)
  console.log('timestamp:', timestamp)
  console.log('url:', url)

  const hash = c.req.param('hash')
  console.log('Draw id:', hash)

  // const { displayName, followerCount } = c.var.interactor || {}
  // console.log('cast:', c.var.cast)
  // console.log('interactor:', c.var.interactor)

  let draw: Draw | undefined
  try {
    draw = (await kv.hgetall(`draw:${hash}`)) as Draw | undefined
  } catch (error) {
    console.error(error)
  }

  if (draw?.criteria) {
    checkUserMeetCriteria(fid, draw.criteria, hash)
  }

  const title = `${draw?.total_award} ${draw?.token} x ${draw?.total_awardees}`
  const howTo = `${draw?.criteria}`
  const beforeDeadline = `Before ${draw?.deadline}`

  return c.res({
    image: (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <svg
          width="75"
          viewBox="0 0 75 65"
          fill="#000"
          style={{ margin: '0 75px' }}
        >
          <path d="M37.59.25l36.95 64H.64l36.95-64z"></path>
        </svg>
        {status === 'initial' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ marginTop: 40, fontSize: 48 }}>{title}</div>
            <div style={{ marginTop: 20 }}>{howTo}</div>
            <div style={{ marginTop: 20 }}>{beforeDeadline}</div>
          </div>
        ) : (
          <div>Your status will be showed here!</div>
        )}
      </div>
    ),
    intents: [
      status === 'response' ? (
        <Button.Reset>Reset</Button.Reset>
      ) : (
        <Button value="check">Check Status</Button>
      ),
    ],
  })
})

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
