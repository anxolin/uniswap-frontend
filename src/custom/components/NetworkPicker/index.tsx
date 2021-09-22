import React, { useMemo } from 'react'

import { mapEnumKeysToArray } from 'utils/misc'
import { ChainId as GpSupportedChainIds, useActiveWeb3React, useSwitchToNetwork } from 'hooks/web3'

// TODO:
// - better styles
// - error handling
// - edge case testing
// - probably make this a part of NetworkCard in Header

export default function NetworkPicker() {
  const { chainId: currentChainId } = useActiveWeb3React()
  const switchToNetwork = useSwitchToNetwork()

  const { chainNames, chainIds } = useMemo(() => {
    const chainList = mapEnumKeysToArray<GpSupportedChainIds>(GpSupportedChainIds)
    return {
      chainList,
      chainNames: chainList.slice(0, chainList.length / 2),
      chainIds: chainList.slice(chainList.length / 2),
    }
  }, [])

  return (
    <div>
      {chainNames.map((chainName, index) => {
        const chainId = chainIds[index]
        if (chainId === currentChainId) return null

        return (
          <button onClick={() => switchToNetwork(chainId)} key={chainId}>
            {chainName}
          </button>
        )
      })}
    </div>
  )
}
