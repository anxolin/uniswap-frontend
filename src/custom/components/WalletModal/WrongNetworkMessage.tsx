import React from 'react'
import { Trans } from '@lingui/macro'
import { NETWORK_LABELS, getSupportedChains } from 'constants/chains'
import styled from 'styled-components'

const CheckSupportedMsg = styled.span`
  font-size: 12px;
  padding-left: 1em;
  display: block;
`

export function WrongNetworkBtn() {
  return (
    <Trans>
      Wrong Network<CheckSupportedMsg>Check supported networks</CheckSupportedMsg>
    </Trans>
  )
}

export function WrongNetworkMessage() {
  const supportedNetworks = getSupportedChains()
    .map((chainId) => NETWORK_LABELS[chainId])
    .map((chain) => <li key={chain}>{chain}</li>)

  console.log('supportedNetworks', supportedNetworks)
  return (
    <Trans>
      Please connect to one of the following networks: <ul>{supportedNetworks}</ul>
    </Trans>
  )
}
