export * from './chainsMod'

export enum StrictlySupportedChainId {
  MAINNET = 1,
  RINKEBY = 4,
  XDAI = 100,
}

export function getSupportedChains(): number[] {
  return Object.values(StrictlySupportedChainId)
    .filter((value) => !isNaN(Number(value)))
    .map(Number)
}
