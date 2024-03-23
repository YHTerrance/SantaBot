import {
  EmbeddedCast,
  CastParamType,
} from '@neynar/nodejs-sdk/build/neynar-api/v2'
import { neynarClient, neynarSigner } from './neynar'
import { getDateTag } from './utils/getDateTag'

interface EmbedOptions {
  embeds?: EmbeddedCast[]
  replyTo?: string
  channelId?: string
}

const getCastsInThread = async (hash: string) => {
  try {
    const data = await neynarClient.fetchAllCastsInThread(hash)
    const casts = data.result.casts
    return casts
  } catch (e) {
    throw new Error(`${getDateTag()} Error retrieving cast replies`)
  }
}

const publishCast = async (
  type: string,
  formattedCast: string,
  imageUrl?: string,
  formattedReply?: string
) => {
  const options = {} as EmbedOptions

  if (imageUrl) {
    options.embeds = [{ url: imageUrl }]
  }

  const cast = await neynarClient.publishCast(
    neynarSigner,
    formattedCast,
    Object.keys(options).length > 0 ? options : undefined
  )
  if (formattedReply) {
    await neynarClient.publishCast(neynarSigner, formattedReply, {
      replyTo: cast.hash,
    })
  }
  console.log(
    `${getDateTag()} Next ${type} published successfully: ${cast.hash}`
  )

  return cast
}

const publishReply = async (
  type: string,
  castHash: string,
  formattedReply: string,
  imageUrl?: string,
  formattedChainedReply?: string,
  signer?: string
) => {
  if (!signer) {
    signer = neynarSigner
  }
  const options = { replyTo: castHash } as EmbedOptions

  if (imageUrl) {
    options.embeds = [{ url: imageUrl }]
  }

  let replyCast
  try {
    replyCast = await neynarClient.publishCast(signer, formattedReply, options)
  } catch (e) {
    console.error(`Failed to publish reply: ${e}`)
    return null
  }

  if (formattedChainedReply) {
    await neynarClient.publishCast(signer, formattedChainedReply, {
      replyTo: replyCast.hash,
    })
  }

  console.log(
    `${getDateTag()} Next ${type} published successfully: ${replyCast.hash}`
  )

  return replyCast
}

const checkIfCastExist = async (cast: string) => {
  try {
    await neynarClient.lookUpCastByHashOrWarpcastUrl(cast, CastParamType.Hash)
  } catch (error) {
    return false
  }
  return true
}

const getUsersThatMeetCriteria = async (criteria: string, cast: string) => {
  let castData
  try {
    castData = await neynarClient.lookUpCastByHashOrWarpcastUrl(
      cast,
      CastParamType.Hash
    )
  } catch (error) {
    console.error(`Failed to look up cast by hash: ${error}`)
    throw error // Rethrow the error to handle it further up the call stack
  }

  const likedFids = castData.cast.reactions.likes.map((like) => like.fid)
  const recastFids = castData.cast.reactions.recasts.map((recast) => recast.fid)

  if (criteria === 'like') {
    return likedFids
  } else if (criteria === 'recast') {
    return recastFids
  } else if (criteria === 'like and recast') {
    return likedFids.filter((fid) => recastFids.includes(fid))
  } else {
    throw new Error('Invalid criteria')
  }
}

const getBulkUsers = async (users: number[]) => {
  const bulkUsers = await neynarClient.fetchBulkUsers(users)
  console.log(bulkUsers.users)
  return bulkUsers.users
}

export {
  getCastsInThread,
  publishCast,
  publishReply,
  getUsersThatMeetCriteria,
  getBulkUsers,
  checkIfCastExist,
}
