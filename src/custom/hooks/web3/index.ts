import { useCallback } from 'react'
import { Web3Provider } from '@ethersproject/providers'
import { useActiveWeb3React } from '@src/hooks/web3'

// json chain data
import mainnet from 'constants/chains/json/mainnet.json'
import rinkeby from 'constants/chains/json/rinkeby.json'
import xdai from 'constants/chains/json/xdai.json'

export * from '@src/hooks/web3'

interface Config {
  key: string
  chainId: number
  chainName: string
  name: string
  shortName: string
  network: string
  rpc: string
  publicRpc?: string
  ws: string
  explorer: string
  nativeAsset: {
    name: string
    address: string
    symbol: string
    decimals: number
    logoURI: string
  }
}

const config: Record<string, Config> = {
  1: mainnet,
  4: rinkeby,
  100: xdai,
}

interface NetworkConfigDetails {
  chainName: string
  rpcUrls?: string
  iconUrls?: string
  nativeAssetName: string
  nativeAssetSymbol: string
  nativeAssetDecimals: number
}

// only supported chain ids in BE
export enum ChainId {
  MAINNET = 1,
  RINKEBY = 4,
  XDAI = 100,
}

type NetworkConfig = {
  [chain in ChainId]: NetworkConfigDetails
}

const NETWORK_CONFIG: NetworkConfig = {
  [ChainId.MAINNET]: {
    chainName: config[ChainId.MAINNET].chainName,
    rpcUrls: config[ChainId.MAINNET].publicRpc,
    iconUrls: config[ChainId.MAINNET].nativeAsset.logoURI,
    nativeAssetName: config[ChainId.MAINNET].nativeAsset.name,
    nativeAssetSymbol: config[ChainId.MAINNET].nativeAsset.symbol,
    nativeAssetDecimals: config[ChainId.MAINNET].nativeAsset.decimals,
  },
  [ChainId.RINKEBY]: {
    chainName: config[ChainId.RINKEBY].chainName,
    rpcUrls: config[ChainId.RINKEBY].publicRpc,
    iconUrls: config[ChainId.RINKEBY].nativeAsset.logoURI,
    nativeAssetName: config[ChainId.RINKEBY].nativeAsset.name,
    nativeAssetSymbol: config[ChainId.RINKEBY].nativeAsset.symbol,
    nativeAssetDecimals: config[ChainId.RINKEBY].nativeAsset.decimals,
  },
  [ChainId.XDAI]: {
    chainName: config[ChainId.XDAI].chainName,
    rpcUrls: config[ChainId.XDAI].publicRpc,
    iconUrls: config[ChainId.XDAI].nativeAsset.logoURI,
    nativeAssetName: config[ChainId.XDAI].nativeAsset.name,
    nativeAssetSymbol: config[ChainId.XDAI].nativeAsset.symbol,
    nativeAssetDecimals: config[ChainId.XDAI].nativeAsset.decimals,
  },
}

const SWITCH_ETHEREUM_CHAIN_METHOD = 'wallet_switchEthereumChain'
const ADD_ETHEREUM_CHAIN_METHOD = 'wallet_addEthereumChain'

async function switchToNetwork(provider: Web3Provider, network: ChainId) {
  const hexChainId = `0x${network.toString(16)}`
  try {
    await provider.send(SWITCH_ETHEREUM_CHAIN_METHOD, [{ chainId: hexChainId }])
    return true
  } catch (err) {
    // user rejected request
    if (err.code === 4001) {
      return false
    }
    // chain does not exist, let's add it
    if (err.code === 4902) {
      return importNetworkDetailsToWallet(provider, network)
    }
  }
  return false
}

async function importNetworkDetailsToWallet(provider: Web3Provider, network: ChainId) {
  const hexChainId = `0x${network.toString(16)}`
  const { chainName, rpcUrls, iconUrls, nativeAssetName, nativeAssetSymbol, nativeAssetDecimals } =
    NETWORK_CONFIG[network]

  try {
    const request = {
      method: ADD_ETHEREUM_CHAIN_METHOD,
      params: [
        {
          chainId: hexChainId,
          chainName,
          rpcUrls: [rpcUrls],
          iconUrls: [iconUrls],
          nativeCurrency: {
            name: nativeAssetName,
            symbol: nativeAssetSymbol,
            decimals: nativeAssetDecimals,
          },
        },
      ],
    }

    const response = await provider.send(request.method, request.params)
    if (response?.error) {
      throw new Error(`Failed to add network information to wallet. ${response.error.code}:${response.error.message}`)
    }
    return true
  } catch (err) {
    console.error(
      `[hooks/web3]::An error occurred while attempting to add network information to wallet. ${err.message}`
    )
    return false
  }
}

export function useSwitchToNetwork() {
  const { library } = useActiveWeb3React()

  return useCallback(
    (network: ChainId) => {
      if (!library) {
        console.debug('[hooks/web3]::No web3 library instantiated!')
      } else {
        switchToNetwork(library, network)
      }
    },
    [library]
  )
}
