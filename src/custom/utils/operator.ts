import { ChainId, ETHER, WETH } from '@uniswap/sdk'
import { getSigningSchemeApiValue, OrderCreation } from 'utils/signatures'
import { APP_ID } from 'constants/index'
import { registerOnWindow } from './misc'
import { isDev } from './environments'
import { FeeInformation, PriceInformation } from 'state/price/reducer'

function getOperatorUrl(): Partial<Record<ChainId, string>> {
  if (isDev) {
    return {
      [ChainId.MAINNET]:
        process.env.REACT_APP_API_URL_STAGING_MAINNET || 'https://protocol-mainnet.dev.gnosisdev.com/api',
      [ChainId.RINKEBY]:
        process.env.REACT_APP_API_URL_STAGING_RINKEBY || 'https://protocol-rinkeby.dev.gnosisdev.com/api',
      [ChainId.XDAI]: process.env.REACT_APP_API_URL_STAGING_XDAI || 'https://protocol-xdai.dev.gnosisdev.com/api'
    }
  }

  // Production, staging, ens, ...
  return {
    [ChainId.MAINNET]: process.env.REACT_APP_API_URL_PROD_MAINNET || 'https://protocol-mainnet.gnosis.io/api',
    [ChainId.RINKEBY]: process.env.REACT_APP_API_URL_PROD_RINKEBY || 'https://protocol-rinkeby.gnosis.io/api',
    [ChainId.XDAI]: process.env.REACT_APP_API_URL_PROD_XDAI || 'https://protocol-xdai.gnosis.io/api'
  }
}

const API_BASE_URL = getOperatorUrl()

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'X-AppId': APP_ID.toString()
}

/**
 * Unique identifier for the order, calculated by keccak256(orderDigest, ownerAddress, validTo),
   where orderDigest = keccak256(orderStruct). bytes32.
 */
export type OrderID = string

// Conforms to backend API
// https://github.com/gnosis/gp-v2-services/blob/0bd5f7743bebaa5acd3be13e35ede2326a096f14/orderbook/openapi.yml#L562
export enum ApiErrorCodes {
  DuplicateOrder = 'DuplicateOrder',
  InvalidSignature = 'InvalidSignature',
  MissingOrderData = 'MissingOrderData',
  InsufficientValidTo = 'InsufficientValidTo',
  InsufficientFunds = 'InsufficientFunds',
  InsufficientFee = 'InsufficientFee',
  UnsupportedToken = 'UnsupportedToken',
  WrongOwner = 'WrongOwner'
}

export interface ApiError {
  errorType: ApiErrorCodes
  description: string
}

export interface OrderMetaData {
  creationDate: string
  owner: string
  uid: OrderID
  availableBalance: string
  executedBuyAmount: string
  executedSellAmount: string
  executedSellAmountBeforeFees: string
  executedFeeAmount: string
  invalidated: false
  sellToken: string
  buyToken: string
  sellAmount: string
  buyAmount: string
  validTo: number
  appData: number
  feeAmount: string
  kind: string
  partiallyFillable: false
  signature: string
}

export interface UnsupportedToken {
  [token: string]: {
    address: string
    dateAdded: number
  }
}

function _getApiBaseUrl(chainId: ChainId): string {
  const baseUrl = API_BASE_URL[chainId]

  if (!baseUrl) {
    throw new Error('Unsupported Network. The operator API is not deployed in the Network ' + chainId)
  } else {
    return baseUrl + '/v1'
  }
}

export function getOrderLink(chainId: ChainId, orderId: OrderID): string {
  const baseUrl = _getApiBaseUrl(chainId)

  return baseUrl + `/orders/${orderId}`
}

function _post(chainId: ChainId, url: string, data: any): Promise<Response> {
  const baseUrl = _getApiBaseUrl(chainId)
  return fetch(baseUrl + url, {
    headers: DEFAULT_HEADERS,
    method: 'POST',
    body: JSON.stringify(data)
  })
}

function _fetchGet(chainId: ChainId, url: string) {
  const baseUrl = _getApiBaseUrl(chainId)
  return fetch(baseUrl + url, {
    headers: DEFAULT_HEADERS
  })
}

async function _getErrorForBadPostOrderRequest(response: Response): Promise<string> {
  let errorMessage: string
  try {
    const orderPostError: ApiError = await response.json()

    switch (orderPostError.errorType) {
      case ApiErrorCodes.DuplicateOrder:
        errorMessage = 'There was another identical order already submitted'
        break

      case ApiErrorCodes.InsufficientFunds:
        errorMessage = "The account doesn't have enough funds"
        break

      case ApiErrorCodes.InvalidSignature:
        errorMessage = 'The order signature is invalid'
        break

      case ApiErrorCodes.MissingOrderData:
        errorMessage = 'The order has missing information'
        break

      default:
        console.error('Unknown reason for bad order submission', orderPostError)
        errorMessage = orderPostError.description
        break
    }
  } catch (error) {
    console.error('Error handling a 400 error. Likely a problem deserialising the JSON response')
    errorMessage = 'The order was not accepted by the network'
  }

  return errorMessage
}

async function _getErrorForUnsuccessfulPostOrder(response: Response): Promise<string> {
  let errorMessage: string
  switch (response.status) {
    case 400:
      errorMessage = await _getErrorForBadPostOrderRequest(response)
      break

    case 403:
      errorMessage = 'The order cannot be accepted. Your account is deny-listed.'
      break

    case 429:
      errorMessage = 'The order cannot be accepted. Too many order placements. Please, retry in a minute'
      break

    case 500:
    default:
      errorMessage = 'Error adding an order'
  }
  return errorMessage
}

export async function postSignedOrder(params: { chainId: ChainId; order: OrderCreation }): Promise<OrderID> {
  const { chainId, order } = params
  console.log('[utils:operator] Post signed order for network', chainId, order)

  // Call API
  const response = await _post(chainId, `/orders`, {
    ...order,
    signingScheme: getSigningSchemeApiValue(order.signingScheme)
  })

  // Handle response
  if (!response.ok) {
    // Raise an exception
    const errorMessage = await _getErrorForUnsuccessfulPostOrder(response)
    throw new Error(errorMessage)
  }

  const uid = (await response.json()) as string
  console.log('[util:operator] Success posting the signed order', uid)
  return uid
}

function checkIfEther(tokenAddress: string, chainId: ChainId) {
  let checkedAddress = tokenAddress
  if (tokenAddress === ETHER.symbol) {
    checkedAddress = WETH[chainId].address
  }

  return checkedAddress
}

export type FeeQuoteParams = Pick<OrderMetaData, 'sellToken' | 'buyToken' | 'kind'> & {
  amount: string
  chainId: ChainId
}

export type PriceQuoteParams = Omit<FeeQuoteParams, 'sellToken' | 'buyToken'> & {
  baseToken: string
  quoteToken: string
}

function toApiAddress(address: string, chainId: ChainId): string {
  if (address === 'ETH') {
    // TODO: Return magical address
    return WETH[chainId].address
  }

  return address
}

async function _getJson(chainId: ChainId, url: string): Promise<any> {
  let response: Response | undefined
  try {
    response = await _fetchGet(chainId, url)
  } finally {
    if (!response) {
      throw new Error(`Error getting query @ ${url}`)
    } else if (!response.ok) {
      const errorResponse = await response.json()
      throw errorResponse
    } else {
      return response.json()
    }
  }
}

export async function getPriceQuote(params: PriceQuoteParams): Promise<PriceInformation> {
  const { baseToken, quoteToken, amount, kind, chainId } = params
  const [checkedBaseToken, checkedQuoteToken] = [checkIfEther(baseToken, chainId), checkIfEther(quoteToken, chainId)]
  console.log('[util:operator] Get Price from API', params)

  return _getJson(
    chainId,
    `/markets/${toApiAddress(checkedBaseToken, chainId)}-${toApiAddress(checkedQuoteToken, chainId)}/${kind}/${amount}`
  )
}

export async function getFeeQuote(params: FeeQuoteParams): Promise<FeeInformation> {
  const { sellToken, buyToken, amount, kind, chainId } = params
  const [checkedSellAddress, checkedBuyAddress] = [checkIfEther(sellToken, chainId), checkIfEther(buyToken, chainId)]
  console.log('[util:operator] Get fee from API', params)

  return _getJson(
    chainId,
    `/fee?sellToken=${toApiAddress(checkedSellAddress, chainId)}&buyToken=${toApiAddress(
      checkedBuyAddress,
      chainId
    )}&amount=${amount}&kind=${kind}`
  )
}

export async function getOrder(chainId: ChainId, orderId: string): Promise<OrderMetaData | null> {
  console.log('[util:operator] Get order for ', chainId, orderId)
  return _getJson(chainId, `/orders/${orderId}`)
}

// Register some globals for convenience
registerOnWindow({ operator: { getFeeQuote, getOrder, postSignedOrder, apiGet: _fetchGet, apiPost: _post } })
