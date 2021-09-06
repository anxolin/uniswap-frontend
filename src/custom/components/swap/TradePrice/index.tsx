import React from 'react'
import TradePriceMod, { TradePriceProps } from './TradePriceMod'

export * from './TradePriceMod'

export default function TradePrice(props: TradePriceProps) {
  return <TradePriceMod {...props} />
}
