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
import { closeDraw, getDrawById } from '../../actions'
import { createAirdrop } from '../../utils/createAirdrop'
import { title } from 'process'

const app = new Frog({
  assetsPath: '/',
  basePath: '/api/frames',
  // Supply a Hub to enable frame verification.
  // hub: neynarHub({ apiKey: process.env.NEYNAR_API_KEY || '' })
})

// Uncomment to use Edge Runtime
// export const runtime = 'edge'

// Common styles for div containers
const commonStyle = {
  height: '100%',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FFB6C1',
}

function getTokenImage(tokenName: string) {
  const tokenImages: { [key: string]: string } = {
    USDC: '/usdc-logo.png',
    XD: '/xd-logo.png',
    // Add more tokens and their image paths as needed
  }
  const defaultImage = '/default-token-logo.png' // Path to a default image if token is not found
  return (
    <img
      src={tokenImages[tokenName] || defaultImage}
      alt={`${tokenName} Logo`}
      style={{ width: 100, height: 100 }}
    />
  )
}

app.frame('/cast/:hash', async (c) => {
  const { status, frameData, buttonValue } = c

  // Fid and username of interactor
  const fid = frameData?.fid || 1
  const hash = c.req.param('hash')

  // Close draw if the button value is close
  if (buttonValue === 'close') {
    await closeDraw(hash)
  }

  const draw = await getDrawById(hash)
  if (draw == null) {
    throw new Error('Draw not found')
  }

  // Draw is open!
  if (buttonValue != 'close' && Number(draw.status) === 0) {
    // Check if user meets the criteria specified in the draw
    const usersThatMeetCriteria = await getUsersThatMeetCriteria(
      draw.criteria,
      hash
    )
    console.log(`cast/${hash}/`, usersThatMeetCriteria)

    const title = `${draw.total_award} ${draw.token} for ${draw.total_awardees} participant(s)`
    const howTo = `${draw.criteria.toUpperCase()} to participate!`
    const beforeDeadline = `Ends by ${draw.deadline}`

    return c.res({
      image: (
        <div
          style={{
            ...commonStyle,
            fontSize: 32,
            fontWeight: 100,
            flexDirection: 'column',
          }}
        >
          {status === 'initial' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {getTokenImage(draw.token)}

              <div style={{ marginTop: 40, fontSize: 48 }}>{title}</div>
              <div
                style={{ display: 'flex', flexDirection: 'row', marginTop: 20 }}
              >
                {howTo}
              </div>
              <div style={{ marginTop: 20 }}>{beforeDeadline}</div>
            </div>
          ) : (
            // Show user status
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{ marginTop: 40, fontSize: 64 }}>
                {usersThatMeetCriteria.includes(fid)
                  ? 'You meet the criteria 🎉'
                  : 'You do not meet the criteria 🥲'}
              </div>
              <div style={{ marginTop: 20, fontSize: 48 }}>
                {`Total users : ${usersThatMeetCriteria.length}`}
              </div>
            </div>
          )}
        </div>
      ),
      intents:
        status === 'response' && fid !== Number(draw.author_fid)
          ? [<Button.Reset>Reset</Button.Reset>]
          : status === 'response'
            ? [
                <Button.Reset>Reset</Button.Reset>,
                <Button value="close">Close Draw</Button>,
              ]
            : [<Button value="check">Check Status</Button>],
    })
  } else {
    // Draw is closed!
    let awardees: any[] = []
    if (draw.awardees.length > 0) {
      awardees = await getBulkUsers(draw.awardees)
    }

    return c.res({
      image: (
        <div
          style={{
            ...commonStyle,
            flexDirection: 'column',
            fontSize: 48,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              textDecoration: 'underline',
            }}
          >
            Awardees!
          </div>
          {awardees.length > 0 ? (
            awardees.slice(0, 5).map((awardee, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 20,
                }}
              >
                <img
                  src={awardee.pfp_url}
                  alt={`Profile Pic`}
                  style={{
                    height: 100,
                    width: 100,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginRight: 20,
                  }}
                />
                <div style={{ fontSize: 56 }}>{`@${awardee.username}`}</div>
              </div>
            ))
          ) : (
            <div>No awardees in this scenario!</div>
          )}
        </div>
      ),
      intents:
        draw.token == 'XD'
          ? fid === Number(draw.author_fid)
            ? [
                <Button.Transaction target="/create-airdrop">
                  Create Airdrop
                </Button.Transaction>,
                <Button.Link href="https://mint.club/token/base/XD">
                  Claim Airdrop
                </Button.Link>,
              ]
            : [
                <Button.Link href="https://mint.club/token/base/XD">
                  Claim Airdrop
                </Button.Link>,
              ]
          : [],
    })
  }
})
// TODO get draw
app.transaction('/create-airdrop', createAirdrop)

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
