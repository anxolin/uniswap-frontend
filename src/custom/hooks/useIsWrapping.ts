import { useAllTransactions, isTransactionRecent } from 'state/transactions/hooks'
import { useActiveWeb3React } from 'hooks'
import { TransactionDetails } from 'state/transactions/reducer'

export default function useIsWrapping() {
  const { chainId } = useActiveWeb3React()
  const transactions = useAllTransactions()

  if (!chainId || !transactions) return false

  const txValues: TransactionDetails[] = Object.values(transactions)

  // filter for any tx with Wrap in the summary
  // then at least 1 without a receipt (pending) that is recent
  return txValues
    .filter(({ summary }) => summary?.includes('Wrap'))
    .some((tx: TransactionDetails) => !tx.receipt && isTransactionRecent(tx))
}
