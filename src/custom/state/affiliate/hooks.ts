import { useSelector } from 'react-redux'
import { AppState } from 'state'
import { useAppDispatch } from 'state/hooks'
import { updateReferralAddress } from 'state/affiliate/actions'
import { useCallback } from 'react'

export function useAppDataHash() {
  return useSelector<AppState, string>((state) => {
    return state.affiliate.appDataHash
  })
}

export function useReferralAddress() {
  return useSelector<AppState, string | undefined>((state) => {
    return state.affiliate.referralAddress
  })
}

export function useResetReferralAddress() {
  const dispatch = useAppDispatch()

  return useCallback(() => dispatch(updateReferralAddress('')), [dispatch])
}
