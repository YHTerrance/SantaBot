/** @jsxImportSource frog/jsx */

import { kv } from '@vercel/kv'

import { Button, Frog, TextInput } from 'frog'
import { devtools } from 'frog/dev'
import { neynar as neynarHub } from 'frog/hubs'
import { handle } from 'frog/next'
import { serveStatic } from 'frog/serve-static'
import {
  getBulkUsers,
  getUsersThatMeetCriteria,
  checkIfCastExist,
} from '../../casts'
import { Draw } from '../../types'
import { closeDraw } from '../../actions'

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

  // Fid and username of interactor
  const fid = frameData?.fid
  console.log('view draw fid:', fid)

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

  // Draw is open!
  if (Number(draw?.status) === 0) {
    // Check if user meets the criteria specified in the draw
    let usersThatMeetCriteria: any[] = []

    if (draw && !(await checkIfCastExist(draw?.id))) {
      console.error(`/cast/:hash: Cast ${draw?.id} does not exist`)
    }

    if (status == 'response' && fid && draw?.criteria) {
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
          ) : (
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
          )}
        </div>
      ),
      intents:
        status === 'response' && fid !== Number(draw?.author_fid)
          ? [<Button.Reset>Reset</Button.Reset>]
          : status === 'response'
            ? [
                <Button.Reset>Reset</Button.Reset>,
                <Button action="/close" value={draw?.id}>
                  Close Draw
                </Button>,
              ]
            : [<Button value="check">Check Status</Button>],
    })
  } else {
    // Draw is closed!
    let awardees: any[] = []
    console.log('awardees', awardees)
    if (draw?.awardees && draw?.awardees.length > 0) {
      awardees = await getBulkUsers(draw?.awardees)
    }

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
            fontSize: 48,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
            }}
          >
            Awardees!
          </div>
          {awardees.slice(0, 5).map((awardee, index) => (
            <div key={index} style={{ marginTop: 20 }}>
              {`@${awardee.username}`}
            </div>
          ))}
        </div>
      ),
      intents: [
        <Button.Link href="https://mint.club/airdrops">
          Claim Airdrop
        </Button.Link>,
      ],
    })
  }
})

app.frame('/close', async (c) => {
  const { buttonValue, frameData } = c

  console.log('/close', buttonValue)

  // Fid and username of interactor
  const fid = frameData?.fid

  let draw: Draw | undefined
  try {
    draw = (await kv.hgetall(`draw:${buttonValue}`)) as Draw | undefined
    console.log(draw)
  } catch (error) {
    console.error(error)
  }

  const isAuthor = fid === Number(draw?.author_fid)
  if (isAuthor && buttonValue) {
    closeDraw(buttonValue)
  }

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
          fontSize: 48,
          fontWeight: 600,
        }}
      >
        {isAuthor ? 'Successfully closed draw!' : 'You are not the author!'}
      </div>
    ),
    intents: [],
  })
})

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
