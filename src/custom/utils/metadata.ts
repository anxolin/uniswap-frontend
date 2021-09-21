import CID from 'cids'
import multihashes from 'multihashes'
import pinataSDK from '@pinata/sdk'
import safeStringify from 'fast-safe-stringify'
import { PINATA_API_KEY, PINATA_SECRET_API_KEY, getIpfsUri } from 'constants/ipfs'

interface Metadata {
  version: string
}

export interface ReferralMetadata extends Metadata {
  address: string
}

export type MetadataDoc = {
  referrer?: ReferralMetadata
}

export type AppDataDoc = {
  version: string
  appCode?: string
  metadata: MetadataDoc
}

export const DEFAULT_APP_CODE = 'CowSwap'

const pinata = pinataSDK(PINATA_API_KEY, PINATA_SECRET_API_KEY)

export function generateReferralMetadataDoc(
  referralAddress: string,
  appDataDoc: AppDataDoc = generateAppDataDoc()
): AppDataDoc {
  return {
    ...appDataDoc,
    metadata: {
      ...appDataDoc.metadata,
      referrer: {
        address: referralAddress,
        version: '0.1.0',
      },
    },
  }
}

export function generateAppDataDoc(metadata: MetadataDoc = {}): AppDataDoc {
  return {
    version: '0.1.0',
    appCode: DEFAULT_APP_CODE,
    metadata: {
      ...metadata,
    },
  }
}

export async function uploadMetadataDocToIpfs(appDataDoc: AppDataDoc): Promise<string> {
  try {
    const { create } = await import('ipfs-http-client')
    const client = create({ url: getIpfsUri() })
    const doc = safeStringify.stableStringify(appDataDoc)
    const { cid } = await client.add(doc)
    await pinata.pinByHash(cid.toString())
    const { digest } = multihashes.decode(new CID(cid.toString()).multihash)
    return `0x${Buffer.from(digest).toString('hex')}`
  } catch (err) {
    console.error('There was an error uploading metadata doc to IPFS', err)
    throw err.message ? err : new Error(err)
  }
}
