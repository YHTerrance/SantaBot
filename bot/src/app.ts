import * as dotenv from "dotenv"
dotenv.config()

import { getDateTag } from "./utils/getDateTag"
import { replyToMentions } from "./services/replyToMentions"
import { neynarSigner } from "./clients/neynar"

console.log(`${getDateTag()} Looking for casters to give out gifts...`)

const santaFid = Number(process.env.SANTA_FID)
const santaLastPollingTime: number = Date.now()
const santaPollingState: boolean = false

console.log(santaFid, neynarSigner, santaLastPollingTime, santaPollingState)

replyToMentions(
  santaFid,
  "santabot",
  neynarSigner,
  santaLastPollingTime,
  santaPollingState
)

