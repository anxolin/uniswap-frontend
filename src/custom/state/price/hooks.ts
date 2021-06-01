import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { AppDispatch, AppState } from 'state'
import {
  updateQuote,
  clearQuote,
  UpdateQuoteParams,
  ClearQuoteParams,
  setLoadingQuote,
  SetLoadingQuoteParams
} from './actions'
import { QuoteInformationObject, QuotesMap } from './reducer'

type SetLoadPriceCallback = (quoteLoadingParams: SetLoadingQuoteParams) => void
type AddPriceCallback = (addFeeParams: UpdateQuoteParams) => void
type ClearPriceCallback = (clearFeeParams: ClearQuoteParams) => void

export const useAllQuotes = ({
  chainId
}: Partial<Pick<ClearQuoteParams, 'chainId'>>): Partial<QuotesMap> | undefined => {
  return useSelector<AppState, Partial<QuotesMap> | undefined>(state => {
    const quotes = chainId && state.price.quotes[chainId]

    if (!quotes) return {}

    return quotes
  })
}

export const useQuote = ({ token, chainId }: Partial<ClearQuoteParams>): QuoteInformationObject | undefined => {
  return useSelector<AppState, QuoteInformationObject | undefined>(state => {
    const fees = chainId && state.price.quotes[chainId]

    if (!fees) return undefined

    return token ? fees[token] : undefined
  })
}

export const useIsQuoteLoading = () =>
  useSelector<AppState, boolean>(state => {
    return state.price.loading
  })

export const useGetQuoteAndStatus = (
  params: Partial<ClearQuoteParams>
): [QuoteInformationObject | undefined, boolean] => {
  const quote = useQuote(params)
  const isLoading = useIsQuoteLoading()
  return [quote, isLoading]
}

export const useSetLoadingQuote = (): SetLoadPriceCallback => {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback((quoteLoadingParams: SetLoadingQuoteParams) => dispatch(setLoadingQuote(quoteLoadingParams)), [
    dispatch
  ])
}

export const useUpdateQuote = (): AddPriceCallback => {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback((updateQuoteParams: UpdateQuoteParams) => dispatch(updateQuote(updateQuoteParams)), [dispatch])
}

export const useClearQuote = (): ClearPriceCallback => {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback((clearQuoteParams: ClearQuoteParams) => dispatch(clearQuote(clearQuoteParams)), [dispatch])
}

interface QuoteDispatchers {
  setLoadingQuote: SetLoadPriceCallback
  updateQuote: AddPriceCallback
  clearQuote: ClearPriceCallback
}

export const useQuoteDispatchers = (): QuoteDispatchers => {
  return { setLoadingQuote: useSetLoadingQuote(), updateQuote: useUpdateQuote(), clearQuote: useClearQuote() }
}
