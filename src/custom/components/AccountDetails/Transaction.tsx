import React, { useCallback, useEffect, useState } from 'react'
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
import styled from 'styled-components'
import {
  ConfirmationModalContent,
  ConfirmationPendingContent,
  TransactionErrorContent,
} from 'components/TransactionConfirmationModal'

import { ActivityStatus, ActivityType, useActivityDescriptors } from 'hooks/useRecentActivity'
import { useCancelOrder } from 'hooks/useCancelOrder'
import { LinkStyledButton } from 'theme'
import { ButtonPrimary } from 'components/Button'
import { MouseoverTooltip } from 'components/Tooltip'
import { GpModal as Modal } from 'components/WalletModal'

import SVG from 'react-inlinesvg'
import TxArrowsImage from 'assets/images/transaction-arrows.svg'
import TxCheckImage from 'assets/images/transaction-confirmed.svg'

import OrderCheckImage from 'assets/images/order-check.svg'
import OrderCrossImage from 'assets/images/order-cross.svg'
import OrderCancelledImage from 'assets/images/order-cancelled.svg'
import OrderOpenImage from 'assets/images/order-open.svg'

const PILL_COLOUR_MAP = {
  CONFIRMED: '#3B7848',
  PENDING_ORDER: '#43758C',
  PENDING_TX: '#43758C',
  EXPIRED_ORDER: '#ED673A',
  CANCELLED_ORDER: '#ED673A',
  CANCELLING_ORDER: '#43758C',
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

const IconType = styled.div`
  height: 36px;
  width: 36px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

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
  color: ${({ theme }) => theme.text1};

  > b {
    color: inherit;
    font-weight: 500;
    line-height: 1;
    font-size: 15px;
    margin: 0 0 5px;
  }

  > div {
    display: flex;
    flex-flow: column wrap;
    width: 100%;
    opacity: 0.75;
  }

  > div > span {
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 100px 1fr;
  }

  > div > span > b,
  > div > span > i {
    position: relative;
    font-size: 13px;
    font-weight: 500;
    margin: 0;
    color: inherit;
    display: flex;
    align-items: center;
    font-style: normal;
  }

  > div > span > b {
    padding: 0;
    font-weight: 500;
  }

  > div > span:nth-of-type(1) > b:before,
  > div > span:nth-of-type(2) > b:before {
    content: '▶';
    margin: 0 5px 0 0;
    color: ${({ theme }) => theme.border2};
    font-size: 8px;
  }
`

const TransactionStatusText = styled.div`
  margin: 0 auto 0 16px;
  display: flex;
  align-items: center;

  &:hover {
    text-decoration: none;
  }
`

const StatusLabelWrapper = styled.div`
  display: flex;
  flex-flow: column wrap;
  flex: 0 1 auto;
`

const StatusLabel = styled.div<{ isPending: boolean }>`
  height: 28px;
  width: 100px;
  border: ${({ isPending, theme }) => isPending && `1px solid ${theme.disabled}`};
  color: ${({ color }) => color};
  position: relative;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;

  &::before {
    content: '';
    background: ${({ color, isPending }) => (isPending ? 'transparent' : color)};
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    border-radius: 4px;
    opacity: 0.1;
  }

  > svg {
    margin: 0 5px 0 0;
  }
`

const StatusLabelBelow = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 11px;
  line-height: 1.1;
  margin: 7px auto 0;
`

function getActivitySummary(params: {
  id: string
  activityData: ReturnType<typeof useActivityDescriptors>
  suffix?: string
  type?: ActivityType
}) {
  const { id, activityData, suffix, type } = params

  if (!activityData) return null

  const { summary } = activityData

  console.log(activityData)

  let baseSummary = summary
  const newSummary = { from: '🤔', to: '🤔', validTo: '🤔' }

  if (!suffix && baseSummary) {
    // Regex 'From' amount in the summary
    // (Probably better to use the specific object keys from baseSummary...)
    const matchFrom = baseSummary
      .match('(?<=Swap ).*?(?= for at least)')
      ?.toString()
      .replace(/[\s,]+/g, ' ') // Probably we should make it part of the initial regex pattern instead...
      .trim()
    newSummary.from = matchFrom ? matchFrom : ''

    // Regex 'To' amount in the summary
    const matchTo = baseSummary
      .match('(?<=for at least ).*?($)')
      ?.toString()
      .replace(/[\s,]+/g, ' ') // Probably we should make it part of the initial regex pattern instead...
      .trim()
    newSummary.to = matchTo ? matchTo : ''

    // Get the 'Valid to' date
    // newSummary.validTo = new Date(activity.validTo * 1000).toLocaleString()
  }

  if (suffix && baseSummary) {
    // Shorten summary when `suffix` is set and it matches the regex.
    // It should always match the regex
    const match = baseSummary.match(/(Swap\s+[\d.]+)/)
    baseSummary = (match && match.length > 1 ? match[1] + ' … ' : baseSummary + ' ') + suffix
  }

  baseSummary = baseSummary ?? id

  return (
    <Summary>
      <b>{type} ↗</b>
      <div>
        <span>
          <b>From</b>
          <i>{newSummary.from}</i>
        </span>
        <span>
          <b>To at least</b>
          <i>{newSummary.to}</i>
        </span>
        {/* <span>
          <b>Valid to: {newSummary.validTo}</b>
        </span> */}
      </div>
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
  padding: 16px;
  border-bottom: 1px solid #d9e8ef;
  transition: background 0.2s ease-in-out;

  &:hover {
    background: rgba(217, 232, 239, 0.35);
  }

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

  const isPending = status === ActivityStatus.PENDING
  const isConfirmed = status === ActivityStatus.CONFIRMED
  const isExpired = status === ActivityStatus.EXPIRED
  const isCancelling = status === ActivityStatus.CANCELLING
  const isCancelled = status === ActivityStatus.CANCELLED
  const isCancellable = isPending && type === ActivityType.ORDER

  const onCancelClick = () => setShowCancelModal(true)
  const onDismiss = () => setShowCancelModal(false)

  // const isLoading = isPending || isCancelling ? true : false

  return (
    <>
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
                  <SVG src={TxArrowsImage} description="No state" />
                )}
              </IconWrapper>
            </IconType>
          )}
          <TransactionStatusText>
            {isCancelling ? (
              <MouseoverTooltip text={activity.summary || id}>
                {getActivitySummary({ activityData, id, suffix: '(Cancellation requested)', type })}
              </MouseoverTooltip>
            ) : (
              getActivitySummary({ activityData, id, type })
            )}
          </TransactionStatusText>
          <StatusLabelWrapper>
            <StatusLabel color={determinePillColour(status, type)} isPending={isPending || isCancelling}>
              {isConfirmed ? (
                <SVG src={OrderCheckImage} description="Order Filled" />
              ) : isExpired ? (
                <SVG src={OrderCrossImage} description="Order Expired" />
              ) : isCancelled ? (
                <SVG src={OrderCancelledImage} description="Order Cancelled" />
              ) : (
                <SVG src={OrderOpenImage} description="Order Open" />
              )}
              {isPending ? 'Open' : isConfirmed ? 'Filled' : isExpired ? 'Expired' : isCancelled ? 'Cancelled' : 'Open'}
            </StatusLabel>

            {isCancelling ? (
              <StatusLabelBelow>
                Cancellation <br /> requested...
              </StatusLabelBelow>
            ) : null}

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
        </RowFixed>
      </TransactionState>
    </>
  )
}
