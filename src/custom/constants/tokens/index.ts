import { ChainId } from '@uniswap/sdk'
import { WETH9, Token } from '@uniswap/sdk-core'
import { DAI_RINKEBY, USDC_RINKEBY, USDT_RINKEBY, WBTC_RINKEBY } from 'utils/rinkeby/constants'
import { DAI, USDC, USDT, WBTC } from 'constants/tokens'
import { USDC_XDAI, /*USDT_XDAI,*/ WBTC_XDAI, WETH_XDAI, WXDAI } from 'utils/xdai/constants'
import { SupportedChainId } from 'constants/chains'
import { V_COW_CONTRACT_ADDRESS } from 'constants/index'

export * from './tokensMod'

function getTrustImage(mainnetAddress: string): string {
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${mainnetAddress}/logo.png`
}

const WETH_ADDRESS_MAINNET = WETH9[ChainId.MAINNET].address

export const ADDRESS_IMAGE_OVERRIDE = {
  // Rinkeby
  [DAI_RINKEBY.address]: getTrustImage(DAI.address),
  [USDC_RINKEBY.address]: getTrustImage(USDC.address),
  [USDT_RINKEBY.address]: getTrustImage(USDT.address),
  [WBTC_RINKEBY.address]: getTrustImage(WBTC.address),
  [WETH9[ChainId.RINKEBY].address]: getTrustImage(WETH_ADDRESS_MAINNET),

  // xDai
  [USDC_XDAI.address]: getTrustImage(USDC.address),
  // [USDT_XDAI.address]: getTrustImage(USDT.address),
  [WBTC_XDAI.address]: getTrustImage(WBTC.address),
  [WXDAI.address]:
    'https://raw.githubusercontent.com/1Hive/default-token-list/master/src/assets/xdai/0xe91d153e0b41518a2ce8dd3d7944fa863463a97d/logo.png',
  [WETH_XDAI.address]: getTrustImage(WETH_ADDRESS_MAINNET),
}

export const V_COW: Record<number, Token> = {
  // TODO: enable once contract addresses are added
  // [SupportedChainId.MAINNET]: new Token(
  //   SupportedChainId.MAINNET,
  //   V_COW_CONTRACT_ADDRESS[1] || '',
  //   18,
  //   'vCOW',
  //   'Virtual CowSwap Token'
  // ),
  // [SupportedChainId.XDAI]: new Token(
  //   SupportedChainId.XDAI,
  //   V_COW_CONTRACT_ADDRESS[100] || '',
  //   18,
  //   'vCOW',
  //   'Virtual CowSwap Token'
  // ),
  [SupportedChainId.RINKEBY]: new Token(
    SupportedChainId.RINKEBY,
    V_COW_CONTRACT_ADDRESS[4] || '',
    18,
    'vCOW',
    'Virtual CowSwap Token'
  ),
}

export const GNO: Record<number, Token> = {
  [SupportedChainId.MAINNET]: new Token(
    SupportedChainId.MAINNET,
    '0x6810e776880c02933d47db1b9fc05908e5386b96',
    18,
    'GNO',
    'Gnosis'
  ),
  [SupportedChainId.XDAI]: new Token(
    SupportedChainId.XDAI,
    '0x9c58bacc331c9aa871afd802db6379a98e80cedb',
    18,
    'GNO',
    'Gnosis'
  ),
  [SupportedChainId.RINKEBY]: new Token(
    SupportedChainId.RINKEBY,
    '0xd0dab4e640d95e9e8a47545598c33e31bdb53c7c',
    18,
    'GNO',
    'Gnosis'
  ),
}
