import { NextApiRequest, NextApiResponse } from 'next';
import { mintclub } from 'mint.club-v2-sdk';

export async function POST(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { wallets, token, isERC20, amountPerClaim, startTime, endTime } = req.body;
      const formattedWallets = wallets.map((wallet: string) => `0x${wallet}`);
      const json = JSON.stringify(formattedWallets, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const ipfsCID = await mintclub.ipfs.add(process.env.FILEBASE_API_KEY as string, blob);
      const merkleRoot = await mintclub.utils.generateMerkleRoot(formattedWallets);

      const airdropResponse = await mintclub.network('base').airdrop.createAirdrop({
        title: 'Test Airdrop',
        token,
        isERC20,
        amountPerClaim,
        walletCount: formattedWallets.length,
        startTime,
        endTime,
        merkleRoot,
        ipfsCID
      });

      res.status(200).json({ success: true, airdropResponse });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
