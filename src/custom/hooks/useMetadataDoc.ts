import { useEffect, useState } from 'react'
import { useActiveWeb3React } from 'hooks/web3'
import { generateReferralMetadataDoc, AppDataDoc } from 'utils/metadata'
import useParseReferralQueryParam from 'hooks/useParseReferralQueryParam'

export function useMetadataDoc() {
  const { account } = useActiveWeb3React()
  const referralAddress = useParseReferralQueryParam()
  const [document, setDocument] = useState<AppDataDoc>(generateReferralMetadataDoc(referralAddress || ''))

  useEffect(() => {
    if (!account || !referralAddress) return //Cannot generate doc if there is no referral address or the user is not connected
    setDocument(generateReferralMetadataDoc(referralAddress))
  }, [referralAddress, account])

  return document
}
