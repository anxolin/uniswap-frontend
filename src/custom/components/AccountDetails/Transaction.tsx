import React, { useCallback, useEffect, useState } from 'react'
import { CurrencyAmount } from '@uniswap/sdk-core'
// import { AlertCircle, CheckCircle, XCircle, Triangle } from 'react-feather'

import { useActiveWeb3React } from 'hooks/web3'
import { getEtherscanLink, shortenOrderId } from 'utils'
import { RowFixed } from 'components/Row'
import Loader, { StyledSVG } from 'components/Loader'
import {
  // TransactionWrapper,
  TransactionState as OldTransactionState,
  // TransactionStatusText,
  IconWrapper,
} from './TransactionMod'
// import Pill from '../Pill'
import styled, { css } from 'styled-components'
import {
  ConfirmationModalContent,
  ConfirmationPendingContent,
  TransactionErrorContent,
} from 'components/TransactionConfirmationModal'

import { ActivityStatus, ActivityType, useActivityDescriptors } from 'hooks/useRecentActivity'
import { useCancelOrder } from 'hooks/useCancelOrder'
import { LinkStyledButton } from 'theme'
import { ButtonPrimary } from 'components/Button'
import { GpModal as Modal } from 'components/Modal'
import { Order } from 'state/orders/actions'

import SVG from 'react-inlinesvg'
import TxArrowsImage from 'assets/cow-swap/transaction-arrows.svg'
import TxCheckImage from 'assets/cow-swap/transaction-confirmed.svg'

import OrderCheckImage from 'assets/cow-swap/order-check.svg'
import OrderExpiredImage from 'assets/cow-swap/order-expired.svg'
import OrderCancelledImage from 'assets/cow-swap/order-cancelled.svg'
import OrderOpenImage from 'assets/cow-swap/order-open.svg'
import { formatSmart } from 'utils/format'
import { transparentize } from 'polished'

const PILL_COLOUR_MAP = {
  CONFIRMED: '#3B7848',
  PENDING_ORDER: '#43758C',
  PENDING_TX: '#43758C',
  EXPIRED_ORDER: '#ED673A',
  CANCELLED_ORDER: '#ED673A',
  CANCELLING_ORDER: '#ED673A',
}

function determinePillColour(status: ActivityStatus, type: ActivityType) {
  const isOrder = type === ActivityType.ORDER
  switch (status) {
    case ActivityStatus.PENDING:
      return isOrder ? PILL_COLOUR_MAP.PENDING_ORDER : PILL_COLOUR_MAP.PENDING_TX
    case ActivityStatus.CONFIRMED:
      return PILL_COLOUR_MAP.CONFIRMED
    case ActivityStatus.EXPIRED:
      return PILL_COLOUR_MAP.EXPIRED_ORDER
    case ActivityStatus.CANCELLING:
      return PILL_COLOUR_MAP.CANCELLING_ORDER
    case ActivityStatus.CANCELLED:
      return PILL_COLOUR_MAP.CANCELLED_ORDER
  }
}

const Wrapper = styled.div`
  display: flex;
  flex-flow: column wrap;
  width: 100%;
  border-bottom: 1px solid #d9e8ef;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    border-bottom: 2px solid #d9e8ef;
  `}
`

const IconType = styled.div`
  height: 36px;
  width: 36px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  ${({ theme }) => theme.mediaWidth.upToMedium`
      display: none;
  `};

  &::before {
    content: '';
    display: block;
    background: ${({ color }) => color};
    position: absolute;
    top: 0;
    left: 0;
    height: inherit;
    width: inherit;
    border-radius: 36px;
    opacity: 0.1;
  }
  svg {
    display: flex;
    margin: auto;
  }
  svg > path {
    width: 100%;
    height: 100%;
    object-fit: contain;
    margin: auto;
    display: block;
    fill: ${({ color }) => color};
  }
  // Loader
  ${StyledSVG} {
    > path {
      fill: transparent;
      stroke: ${({ color }) => color};
    }
  }
`

const Summary = styled.div`
  display: flex;
  flex-flow: column wrap;
  color: ${({ theme }) => theme.text2};

  > b {
    color: inherit;
    font-weight: normal;
    line-height: 1;
    font-size: 15px;
    margin: 0 0 5px;
    text-transform: capitalize;

    ${({ theme }) => theme.mediaWidth.upToSmall`
      margin: 0 0 12px;
      font-weight: bold;
    `}
  }
`

const SummaryInner = styled.div`
  display: flex;
  flex-flow: column wrap;
  width: 100%;
  opacity: 0.75;
  font-size: 13px;
`

const SummaryInnerRow = styled.div`
  display: grid;
  color: inherit;
  grid-template-rows: 1fr;
  grid-template-columns: 90px 1fr;

  ${({ theme }) => theme.mediaWidth.upToSmall`
      grid-template-columns: 1fr;
      margin: 0 16px 8px 0;
  `};

  > b,
  > i {
    position: relative;
    font-size: inherit;
    font-weight: 500;
    margin: 0;
    color: inherit;
    display: flex;
    align-items: center;
    font-style: normal;
  }

  > b {
    padding: 0;
    font-weight: 500;
    opacity: 0.8;

    &:before {
      content: '▶';
      margin: 0 5px 0 0;
      color: ${({ theme }) => theme.text2};
      font-size: 8px;
    }
  }

  > i {
    word-break: break-all;
    white-space: break-spaces;

    ${({ theme }) => theme.mediaWidth.upToSmall`
      font-weight: 600;
      margin: 4px 0 0 12px;
    `}

    &.cancelled {
      text-decoration: line-through;
    }
  }
`

const TransactionStatusText = styled.div`
  margin: 0 auto 0 16px;
  display: flex;
  align-items: center;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    margin: 0 auto 0 0;
  `};

  &.copied,
  &:hover {
    text-decoration: none;
  }
`

const StatusLabelWrapper = styled.div`
  display: flex;
  flex-flow: column wrap;
  flex: 0 1 auto;
  justify-content: center;
`

const StatusLabel = styled.div<{ isPending: boolean; isCancelling: boolean }>`
  height: 28px;
  width: 100px;
  border: ${({ isPending, isCancelling, theme }) => !isCancelling && isPending && `1px solid ${theme.border2}`};
  color: ${({ color }) => color};
  position: relative;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;

  &::before {
    content: '';
    background: ${({ color, isPending, isCancelling }) => (!isCancelling && isPending ? 'transparent' : color)};
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    border-radius: 4px;
    opacity: 0.1;
  }

  ${({ theme, color, isCancelling }) =>
    isCancelling &&
    color &&
    css`
      &::after {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        transform: translateX(-100%);
        background-image: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0,
          ${transparentize(0.9, color)} 20%,
          ${theme.bg2} 60%,
          rgba(255, 255, 255, 0)
        );
        animation: shimmer 2s infinite;
        content: '';
      }
    `}

  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }

  > svg {
    margin: 0 5px 0 0;
  }
`

const TransactionWrapper = styled.div`
  width: 100%;
  border-radius: 0;
  font-size: initial;
  display: flex;
  margin: 0;
  padding: 16px;
  transition: background 0.2s ease-in-out;

  &:hover {
    background: rgba(217, 232, 239, 0.35);
  }
`

const StatusLabelBelow = styled.div<{ isCancelling?: boolean }>`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  line-height: 1.1;
  margin: 7px auto 0;
  color: ${({ isCancelling, theme }) => (isCancelling ? theme.primary1 : 'inherit')};

  ${LinkStyledButton} {
    margin: 2px 0;
  }
`

interface OrderSummaryType {
  from: string | undefined
  to: string | undefined
  limitPrice: string | undefined
  validTo: string | undefined
  kind?: string
}

function ActivitySummary(params: {
  id: string
  activityData: ReturnType<typeof useActivityDescriptors>
  isCancelled: boolean
}) {
  const { id, activityData, isCancelled } = params

  if (!activityData) return null

  const { activity, type, summary } = activityData

  // Order Summary default object
  const orderSummary: OrderSummaryType = {
    from: '🤔',
    to: '🤔',
    limitPrice: '🤔',
    validTo: '🤔',
  }

  const isOrder = type === ActivityType.ORDER

  if (isOrder) {
    const { inputToken, sellAmount, feeAmount, outputToken, buyAmount, validTo, kind } = activity as Order

    const sellAmt = CurrencyAmount.fromRawAmount(inputToken, sellAmount.toString())
    const feeAmt = CurrencyAmount.fromRawAmount(inputToken, feeAmount.toString())
    const outputAmount = CurrencyAmount.fromRawAmount(outputToken, buyAmount.toString())

    orderSummary.from = `${formatSmart(sellAmt.add(feeAmt))} ${sellAmt.currency.symbol}`
    orderSummary.to = `${formatSmart(outputAmount)} ${outputAmount.currency.symbol}`
    orderSummary.validTo = new Date((validTo as number) * 1000).toLocaleString()
    orderSummary.kind = kind.toString()
  }

  return (
    <Summary>
      <b>{isOrder ? `${orderSummary.kind} order` : 'Transaction'} ↗</b>
      <SummaryInner>
        {isOrder ? (
          <>
            <SummaryInnerRow>
              <b>From{orderSummary.kind === 'buy' && ' at most'}</b>
              <i>{orderSummary.from}</i>
            </SummaryInnerRow>
            <SummaryInnerRow>
              <b>To{orderSummary.kind === 'sell' && ' at least'}</b>
              <i>{orderSummary.to}</i>
            </SummaryInnerRow>
            <SummaryInnerRow>
              <b>Limit price</b>
              <i>{orderSummary.limitPrice}</i>
            </SummaryInnerRow>
            <SummaryInnerRow>
              <b>Valid to</b>
              <i className={isCancelled ? 'cancelled' : ''}>{orderSummary.validTo}</i>
            </SummaryInnerRow>
          </>
        ) : (
          summary ?? id
        )}
      </SummaryInner>
    </Summary>
  )
}

// override the href, pending and success props
// override mouse actions via CSS when we dont want a clickable row
const TransactionState = styled(OldTransactionState).attrs(
  (props): { href?: string; disableMouseActions?: boolean; pending?: boolean; success?: boolean } => props
)`
  ${(props): string | false => !!props.disableMouseActions && `pointer-events: none; cursor: none;`}
  width: 100%;
  border-radius: 0;
  font-size: initial;
  display: flex;
  margin: 0;
  padding: 0;

  ${RowFixed} {
    width: 100%;
  }
`

export const CancellationSummary = styled.span`
  padding: 12px;
  margin: 0;
  border-radius: 6px;
  background: ${({ theme }) => theme.bg4};
`

const TransactionAlertMessage = styled.div`
  width: 100%;
  padding: 0;
  background: ${({ theme }) => theme.yellow};
  color: black;
  font-size: 13px;
  display: flex;
  justify-content: center;

  > p {
    padding: 10px;
    margin: 0;
    margin: 0 auto;
  }

  > p > a {
    color: ${({ theme }) => theme.primary1};
  }
`

type RequestCancellationModalProps = {
  onDismiss: () => void
  onClick: () => void
  summary?: string
  shortId: string
}

function RequestCancellationModal(props: RequestCancellationModalProps): JSX.Element {
  const { onDismiss, onClick, summary, shortId } = props

  const [showMore, setShowMore] = useState(false)

  const toggleShowMore = () => setShowMore((showMore) => !showMore)

  return (
    <ConfirmationModalContent
      title={`Cancel order ${shortId}`}
      onDismiss={onDismiss}
      topContent={() => (
        <>
          <p>
            Are you sure you want to cancel order <strong>{shortId}</strong>?
          </p>
          <CancellationSummary>{summary}</CancellationSummary>
          <p>
            Keep in mind this is a soft cancellation{' '}
            <LinkStyledButton onClick={toggleShowMore}>[{showMore ? '- less' : '+ more'}]</LinkStyledButton>
          </p>
          {showMore && (
            <>
              <p>
                This means that a solver might already have included the order in a solution even if this cancellation
                is successful. Read more in the{' '}
                <a target="_blank" href="/#/faq#can-i-cancel-an-order">
                  FAQ
                </a>
                .
              </p>
            </>
          )}
        </>
      )}
      bottomContent={() => <ButtonPrimary onClick={onClick}>Request cancellation</ButtonPrimary>}
    />
  )
}

type CancellationModalProps = {
  onDismiss: () => void
  isOpen: boolean
  orderId: string
  summary: string | undefined
}

function CancellationModal(props: CancellationModalProps): JSX.Element | null {
  const { orderId, isOpen, onDismiss, summary } = props
  const shortId = shortenOrderId(orderId)

  const [isWaitingSignature, setIsWaitingSignature] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelOrder = useCancelOrder()

  useEffect(() => {
    // Reset status every time orderId changes to avoid race conditions
    setIsWaitingSignature(false)
    setError(null)
  }, [orderId])

  const onClick = useCallback(() => {
    setIsWaitingSignature(true)
    setError(null)

    cancelOrder(orderId)
      .then(onDismiss)
      .catch((e) => {
        setError(e.message)
      })
  }, [cancelOrder, onDismiss, orderId])

  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss}>
      {error !== null ? (
        <TransactionErrorContent onDismiss={onDismiss} message={error || 'Failed to cancel order'} />
      ) : isWaitingSignature ? (
        <ConfirmationPendingContent
          onDismiss={onDismiss}
          pendingText={`Soft cancelling order with id ${shortId}\n\n${summary}`}
        />
      ) : (
        <RequestCancellationModal onDismiss={onDismiss} onClick={onClick} summary={summary} shortId={shortId} />
      )}
    </Modal>
  )
}

export default function Transaction({ hash: id }: { hash: string }) {
  const { chainId } = useActiveWeb3React()
  // Return info necessary for rendering order/transaction info from the incoming id
  // returns info related to activity: TransactionDetails | Order
  const activityData = useActivityDescriptors({ id, chainId })

  const [showCancelModal, setShowCancelModal] = useState(false)

  if (!activityData || !chainId) return null

  const { activity, status, type } = activityData

  // Type of Statuses
  const isPending = status === ActivityStatus.PENDING
  const isConfirmed = status === ActivityStatus.CONFIRMED
  const isExpired = status === ActivityStatus.EXPIRED
  const isCancelling = status === ActivityStatus.CANCELLING
  const isCancelled = status === ActivityStatus.CANCELLED
  const isCancellable = isPending && type === ActivityType.ORDER
  const isUnfillable = isCancellable && (activity as Order).isUnfillable

  // Type of Transaction
  const isTransaction = type === ActivityType.TX

  const onCancelClick = () => setShowCancelModal(true)
  const onDismiss = () => setShowCancelModal(false)

  return (
    <Wrapper>
      <TransactionWrapper>
        <TransactionState href={getEtherscanLink(chainId, id, 'transaction')}>
          <RowFixed>
            {activity && (
              <IconType color={determinePillColour(status, type)}>
                <IconWrapper pending={isPending || isCancelling} success={isConfirmed || isCancelled}>
                  {isPending || isCancelling ? (
                    <Loader />
                  ) : isConfirmed ? (
                    <SVG src={TxCheckImage} description="Order Filled" />
                  ) : isExpired ? (
                    <SVG src={TxArrowsImage} description="Order Expired" />
                  ) : isCancelled ? (
                    <SVG src={TxArrowsImage} description="Order Cancelled" />
                  ) : (
                    <SVG src={TxArrowsImage} description="Order Open" />
                  )}
                </IconWrapper>
              </IconType>
            )}
            <TransactionStatusText>
              <ActivitySummary activityData={activityData} id={id} isCancelled={isCancelled} />
            </TransactionStatusText>
          </RowFixed>
        </TransactionState>

        <StatusLabelWrapper>
          <StatusLabel color={determinePillColour(status, type)} isPending={isPending} isCancelling={isCancelling}>
            {isConfirmed ? (
              <SVG src={OrderCheckImage} description="Order Filled" />
            ) : isExpired ? (
              <SVG src={OrderExpiredImage} description="Order Expired" />
            ) : isCancelled ? (
              <SVG src={OrderCancelledImage} description="Order Cancelled" />
            ) : isCancelling ? null : (
              <SVG src={OrderOpenImage} description="Order Open" />
            )}
            {isPending
              ? 'Open'
              : isConfirmed && isTransaction
              ? 'Approved'
              : isConfirmed
              ? 'Filled'
              : isExpired
              ? 'Expired'
              : isCancelling
              ? 'Cancelling...'
              : isCancelled
              ? 'Cancelled'
              : 'Open'}
          </StatusLabel>

          {isCancellable && (
            <StatusLabelBelow>
              <LinkStyledButton onClick={onCancelClick}>Cancel order</LinkStyledButton>
              {showCancelModal && (
                <CancellationModal
                  orderId={id}
                  summary={activityData.summary}
                  isOpen={showCancelModal}
                  onDismiss={onDismiss}
                />
              )}
            </StatusLabelBelow>
          )}
        </StatusLabelWrapper>
      </TransactionWrapper>

      {isUnfillable && (
        <TransactionAlertMessage>
          <p>
            <span role="img" aria-label="alert">
              🚨
            </span>{' '}
            Price out of range. <a href="#/faq">Read more</a>.
          </p>
        </TransactionAlertMessage>
      )}
    </Wrapper>
  )
}
