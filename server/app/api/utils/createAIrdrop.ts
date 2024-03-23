import { mintclub, MERKLE_ABI } from 'mint.club-v2-sdk'

interface CreateAirdropParams {
  wallets: `0x${string}`[]
  apiKey: string
  title: string
  token: `0x${string}`
  isERC20: boolean
  amountPerClaim: bigint
  startTime: number
  endTime: number
}

// create a 7-day airdrop
const createAirdrop = async ({
  wallets, // awardees
  title,
  amountPerClaim,
}: CreateAirdropParams) => {
  const json = JSON.stringify(wallets, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const ipfsCID = await mintclub.ipfs.add(
    process.env.FILEBASE_API_KEY as string,
    blob
  )
  const merkleRoot = await mintclub.utils.generateMerkleRoot(wallets)

  const BASE_AIRDROP_FACTORY = 0x1349a9ddee26fe16d0d44e35b3cb9b0ca18213a4
  const XD_TOKEN_ADDRESS = 0x022f158545e25a7b91563a0b0a06b9d762ae672b
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
  return {
    abi: MERKLE_ABI,
    chainId: 'eip155:8453',
    functionName: 'createDistribution',
    args,
    to: BASE_AIRDROP_FACTORY,
  }
}

export { createAirdrop }
