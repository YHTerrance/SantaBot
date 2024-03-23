/** @jsxImportSource frog/jsx */

import { kv } from '@vercel/kv'
import { Button, Frog, TextInput } from 'frog'
import { devtools } from 'frog/dev'
import { neynar as neynarHub } from 'frog/hubs'
import { neynar } from 'frog/middlewares'
import { handle } from 'frog/next'
import { serveStatic } from 'frog/serve-static'
import { getUsersThatMeetCriteria } from '../../casts'
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

  const fid = frameData?.fid || 0
  console.log('fid:', fid)

  const hash = c.req.param('hash')
  console.log('Draw id:', hash)

  // const { displayName, followerCount } = c.var.interactor || {}
  // console.log('cast:', c.var.cast)
  // console.log('interactor:', c.var.interactor)

  let draw: Draw | undefined
  try {
    draw = (await kv.hgetall(`draw:${hash}`)) as Draw | undefined
    console.log(draw)
  } catch (error) {
    console.error(error)
  }

  // Check if user meets the criteria specified in the draw
  let usersThatMeetCriteria: any[] = []
  if (status == 'response' && fid && draw?.criteria && fid) {
    usersThatMeetCriteria =
      (await getUsersThatMeetCriteria(draw.criteria, hash)) || []
    console.log(usersThatMeetCriteria)
  }

  const title = `${draw?.total_award} ${draw?.token} x ${draw?.total_awardees}`
  const howTo = `${draw?.criteria} the original cast to participate in the draw`
  const beforeDeadline = `Ends by ${draw?.deadline}`

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
        ) : Number(draw?.status) === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ marginTop: 40, fontSize: 48 }}>
              {usersThatMeetCriteria.includes(fid)
                ? 'You meet the criteria!'
                : 'You do not meet the criteria.'}
            </div>
            <div style={{ marginTop: 20 }}>
              {`Total users in draw: ${usersThatMeetCriteria.length}`}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div style={{ marginTop: 40, fontSize: 48 }}>
              {draw?.awardees.includes(fid)
                ? 'Congratulations! Contact the organizer to claim your reward!'
                : 'You are not selected for the reward. Try again next time!'}
            </div>
          </div>
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
