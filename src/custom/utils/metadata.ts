import IPFS from 'ipfs-core'
import CID from 'cids'
import multihashes from 'multihashes'
import pinataSDK from '@pinata/sdk'

export enum MetadataKind {
  REFERRAL = 'referrer',
}

interface Metadata {
  kind: MetadataKind
  version: string
}

export interface ReferralMetadata extends Metadata {
  referrer: string
}

export type MetadataDoc = {
  [MetadataKind.REFERRAL]?: ReferralMetadata
}

export type AppDataDoc = {
  version: string
  appCode?: string
  metadata: MetadataDoc
}

export const DEFAULT_APP_CODE = 'CowSwap'

const pinata = pinataSDK(
  process.env.REACT_APP_PINATA_API_KEY as string,
  process.env.REACT_APP_PINATA_SECRET_API_KEY as string
)

export function generateReferralMetadataDoc(
  referralAddress: string,
  appDataDoc: AppDataDoc = generateAppDataDoc()
): AppDataDoc {
  return {
    ...appDataDoc,
    metadata: {
      ...appDataDoc.metadata,
      referrer: {
        kind: MetadataKind.REFERRAL,
        referrer: referralAddress,
        version: '1.0.0',
      },
    },
  }
}

export function generateAppDataDoc(metadata: MetadataDoc = {}): AppDataDoc {
  return {
    version: '1.0.0',
    appCode: DEFAULT_APP_CODE,
    metadata: {
      ...metadata,
    },
  }
}

export async function uploadMetadataDocToIpfs(appDataDoc: AppDataDoc): Promise<string> {
  try {
    const ipfs = await IPFS.create()
    const doc = JSON.stringify(appDataDoc)
    const { cid } = await ipfs.add(doc)
    await pinata.pinByHash(cid.toString())
    const { digest } = multihashes.decode(new CID(cid.toString()).multihash)
    return `0x${Buffer.from(digest).toString('hex')}`
  } catch (err) {
    console.error('There was an error uploading metadata doc to IPFS', err)
    throw err.message ? err : new Error(err)
  }
}
