import { ActionCreatorWithPayload, createAction } from '@reduxjs/toolkit'
import { ChainId } from '@uniswap/sdk'
import { TokenList, Version } from '@uniswap/token-lists'
import { DEFAULT_NETWORK_FOR_LISTS } from '@src/custom/constants/lists'

export interface WithChainId {
  chainId?: ChainId
}

interface WithChainIdAndUrl extends WithChainId {
  url: string
}

interface PendingFetchTokenList extends WithChainIdAndUrl {
  requestId: string
}

interface FulfilledFetchTokenList extends PendingFetchTokenList {
  tokenList: TokenList
}

interface RejectedFetchTokenList extends PendingFetchTokenList {
  errorMessage: string
}

// Takes the payload of every action and if no chainId is found, sets to default
// found in constants/index::DEFAULT_NETWORK_FOR_LISTS
// allows us not to have to make this change in many places
export const setDefaultChainId = <T extends WithChainId>(payload: T) => ({
  payload: {
    ...payload,
    chainId: payload.chainId || DEFAULT_NETWORK_FOR_LISTS
  }
})

//MOD: adds chainId to param
export const fetchTokenList: Readonly<{
  pending: ActionCreatorWithPayload<PendingFetchTokenList>
  fulfilled: ActionCreatorWithPayload<FulfilledFetchTokenList>
  rejected: ActionCreatorWithPayload<RejectedFetchTokenList>
}> = {
  pending: createAction<PendingFetchTokenList>('lists/fetchTokenList/pending'),
  fulfilled: createAction<FulfilledFetchTokenList>('lists/fetchTokenList/fulfilled'),
  rejected: createAction<RejectedFetchTokenList>('lists/fetchTokenList/rejected')
}
// add and remove from list options
export const addList = createAction<WithChainIdAndUrl>('lists/addList')
export const removeList = createAction<WithChainIdAndUrl>('lists/removeList')

// select which lists to search across from loaded lists
export const enableList = createAction<WithChainIdAndUrl>('lists/enableList')
export const disableList = createAction<WithChainIdAndUrl>('lists/disableList')

// versioning
export const acceptListUpdate = createAction<WithChainIdAndUrl>('lists/acceptListUpdate')
export const rejectVersionUpdate = createAction<WithChainId & { version: Version }>('lists/rejectVersionUpdate')
