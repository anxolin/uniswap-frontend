import React from 'react'
// import { computeTradePriceBreakdown } from '../TradeSummary'
import SwapModalHeaderMod, { SwapModalHeaderProps } from './SwapModalHeaderMod'
import { AutoColumn } from 'components/Column'
import styled from 'styled-components'
import { LightCard as LightCardUni } from 'components/Card'
import { darken } from 'polished'

// MOD
const LightCard = styled(LightCardUni)`
  background-color: ${({ theme }) => darken(0.06, theme.bg1)};
  border: 2px solid ${({ theme }) => theme.bg0};
`

const Wrapper = styled.div`
  svg {
    stroke: ${({ theme }) => theme.text1};
  }

  ${AutoColumn} > div > div {
    color: ${({ theme }) => theme.text1};
  }
`

export default function SwapModalHeader(props: Omit<SwapModalHeaderProps, 'LightCard'>) {
  // const { priceImpactWithoutFee } = React.useMemo(() => computeTradePriceBreakdown(props.trade), [props.trade])
  return (
    <Wrapper>
      <SwapModalHeaderMod {...props} LightCard={LightCard} /*priceImpactWithoutFee={priceImpactWithoutFee}*/ />
    </Wrapper>
  )
}
