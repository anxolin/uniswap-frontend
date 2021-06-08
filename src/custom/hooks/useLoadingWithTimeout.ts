import { useEffect, useState } from 'react'

export default function useLoadingWithTimeout(isLoading: boolean, time: number) {
  const [delayedLoad, setDelayedLoad] = useState(isLoading)

  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined
    // price is being queried
    if (isLoading) {
      // isn't currently showing cow or hasnt yet been updated here
      // so we clear any running timeouts ready to clear local loading state
      // and essentially reset them
      timeout && clearTimeout(timeout)
      setDelayedLoad(true)
    } else {
      // no longer loading
      // reset timeout to clear local loading state after LOADING_COW_TIMER ms
      if (delayedLoad) {
        timeout = setTimeout(() => {
          clearTimeout(timeout as NodeJS.Timeout)
          setDelayedLoad(false)
        }, time)
      }
    }

    return () => timeout && clearTimeout(timeout)
    // Disable exhaustive deps as this only needs to be aware of the softLoading prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  return delayedLoad
}
