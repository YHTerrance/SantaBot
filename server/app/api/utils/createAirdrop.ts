import { MerkleDistributorABI } from './abis/MerkleDistributorABI'
import { mintclub, wei } from 'mint.club-v2-sdk'
import { getDrawById } from '../actions'
import { getBulkUsers } from '../casts'

// create a 7-day airdrop
const createAirdrop = async (context: any) => {
  // Fid and username of interactor
  const hash = context.req.param('hash')

  // get draw
  const draw = await getDrawById(hash)
  if (draw == null) {
    throw new Error('Draw not found')
  }

  // convert FID to wallet address
  const users = await getBulkUsers(draw.awardees)
  const wallets: `0x${string}`[] = users.map(
    (user) => user.verified_addresses.eth_addresses[0] as `0x${string}`
  )

  const amountPerClaim = wei(draw.total_award, 18)

  const title = `${draw.total_award} ${draw.token} for ${draw.total_awardees} participant(s) in draw ${hash}`

  const json = JSON.stringify(wallets, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const ipfsCID = await mintclub.ipfs.add(
    process.env.FILEBASE_API_KEY as string,
    blob
  )
  const merkleRoot = await mintclub.utils.generateMerkleRoot(wallets)

  const BASE_AIRDROP_FACTORY = '0x1349a9ddee26fe16d0d44e35b3cb9b0ca18213a4'
  const XD_TOKEN_ADDRESS = '0x022f158545e25a7b91563a0b0a06b9d762ae672b'
  const startTime = Math.floor(Date.now() / 1000)
  const endTime = Math.floor(Date.now() / 1000 + 60 * 60 * 24 * 7)
  const args = [
    title,
    XD_TOKEN_ADDRESS,
    true,
    amountPerClaim,
    wallets.length,
    startTime,
    endTime,
    merkleRoot,
    ipfsCID,
  ]
  return context.contract({
    abi: MerkleDistributorABI,
    chainId: 'eip155:8453' as
      | 'eip155:8453'
      | 'eip155:10'
      | 'eip155:84532'
      | 'eip155:7777777',
    functionName: 'createDistribution',
    args: args,
    to: BASE_AIRDROP_FACTORY as `0x${string}`,
  })
}

export { createAirdrop }
