import { BigNumber } from '@ethersproject/bignumber'
import { useCallback } from 'react'
import { useClearQuote, useUpdateQuote } from 'state/price/hooks'
import { getCanonicalMarket, registerOnWindow } from 'utils/misc'
import { ApiErrorCodes, FeeQuoteParams, getFeeQuote, getPriceQuote } from 'utils/operator'
import {
  useAddGpUnsupportedToken,
  useGpUnsupportedTokens,
  useRemoveGpUnsupportedToken
} from 'state/lists/hooks/hooksMod'
import { FeeInformation, PriceInformation } from 'state/price/reducer'

export interface RefetchQuoteCallbackParmams {
  quoteParams: FeeQuoteParams
  fetchFee: boolean
  previousFee?: FeeInformation
}

async function getQuote({
  quoteParams,
  fetchFee,
  previousFee
}: RefetchQuoteCallbackParmams): Promise<[PriceInformation, FeeInformation]> {
  const { sellToken, buyToken, amount, kind, chainId } = quoteParams
  const { baseToken, quoteToken } = getCanonicalMarket({ sellToken, buyToken, kind })

  // Get a new fee quote (if required)
  const feePromise =
    fetchFee || !previousFee ? getFeeQuote({ chainId, sellToken, buyToken, amount, kind }) : previousFee

  // Get a new price quote
  let exchangeAmount
  if (kind === 'sell') {
    // Sell orders need to deduct the fee from the swapped amount
    exchangeAmount = BigNumber.from(amount)
      .sub((await feePromise).amount)
      .toString()
  } else {
    // For buy orders, we swap the whole amount, then we add the fee on top
    exchangeAmount = amount
  }

  // Get price for price estimation
  const pricePromise = getPriceQuote({ chainId, baseToken, quoteToken, amount: exchangeAmount, kind })

  return Promise.all([pricePromise, feePromise])
}

/**
 * @returns callback that fetches a new quote and update the state
 */
export function useRefetchQuoteCallback() {
  const gpUnsupportedTokens = useGpUnsupportedTokens()
  // dispatchers
  const updateQuote = useUpdateQuote()
  const clearQuote = useClearQuote()
  const addUnsupportedToken = useAddGpUnsupportedToken()
  const removeGpUnsupportedToken = useRemoveGpUnsupportedToken()

  registerOnWindow({ updateQuote, addUnsupportedToken, removeGpUnsupportedToken })

  return useCallback(
    async (params: RefetchQuoteCallbackParmams) => {
      const { sellToken, buyToken, amount, chainId } = params.quoteParams
      try {
        // Get the quote
        const [price, fee] = await getQuote(params)

        const previouslyUnsupportedToken =
          gpUnsupportedTokens && (gpUnsupportedTokens[sellToken] || gpUnsupportedTokens[buyToken])
        // can be a previously unsupported token which is now valid
        // so we check against map and remove it
        if (previouslyUnsupportedToken) {
          console.debug('[useRefetchPriceCallback]::Previously unsupported token now supported - re-enabling.')

          removeGpUnsupportedToken({
            chainId,
            address: previouslyUnsupportedToken.address.toLowerCase()
          })
        }

        // Update quote
        updateQuote({
          sellToken,
          buyToken,
          amount,
          price,
          chainId,
          lastCheck: Date.now(),
          fee
        })
      } catch (error) {
        const errorType = error?.errorType
        console.error('Error getting the quote (price/fee):', errorType)

        // Unsupported token
        if (errorType === ApiErrorCodes.UnsupportedToken) {
          // TODO: will change with introduction of data prop in error responses
          const unsupportedTokenAddress = error?.description?.split(' ')[2]

          console.error(
            '[useRefetchPriceCallback]::Unsupported token detected:',
            unsupportedTokenAddress,
            '- disabling.'
          )

          addUnsupportedToken({
            chainId,
            address: unsupportedTokenAddress.toLowerCase(),
            dateAdded: Date.now()
          })
        }

        // Clear the quote
        clearQuote({ chainId, token: sellToken })
      }
    },
    [gpUnsupportedTokens, updateQuote, removeGpUnsupportedToken, clearQuote, addUnsupportedToken]
  )
}
