import { ChainId, WETH } from '@uniswap/sdk'
import { FeeInformation, FeeInformationObject } from '../../src/custom/state/fee/reducer'
import { parseUnits } from 'ethers/lib/utils'

const DAI = '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735'
const RINKEBY = ChainId.RINKEBY.toString()
const FEE_QUOTES_LOCAL_STORAGE_KEY = 'redux_localstorage_simple_fee'
const FOUR_HOURS = 3600 * 4 * 1000

const getFeeQuery = (token: string) => `https://protocol-rinkeby.dev.gnosisdev.com/api/v1/tokens/${token}/fee`

function _assertFeeData(fee: FeeInformation, [minimalFee, feeRatio, expirationDate]: (string | number)[] = []): void {
  // Allows use to assert not only it exists but that it can now accept expected property values
  minimalFee ? expect(fee).to.have.property('minimalFee', minimalFee) : expect(fee).to.have.property('minimalFee')
  feeRatio ? expect(fee).to.have.property('feeRatio', feeRatio) : expect(fee).to.have.property('feeRatio')
  expirationDate
    ? expect(fee).to.have.property('expirationDate', expirationDate)
    : expect(fee).to.have.property('expirationDate')
}

function _getLocalStorage(): Cypress.Chainable<Storage> {
  return cy.window().then(window => window.localStorage)
}

function _getChainFeeStorage(
  networkKey: string,
  token?: string
): Cypress.Chainable<{ [t: string]: FeeInformationObject }> {
  return (
    _getLocalStorage()
      .its(FEE_QUOTES_LOCAL_STORAGE_KEY)
      // To properly return this we need .should and an expectation
      .should(feeQuotesStorage => {
        expect(JSON.parse(feeQuotesStorage)).to.have.property(networkKey)
        token && expect(JSON.parse(feeQuotesStorage)[RINKEBY]).to.have.property(token)
      })
      .then(fee => JSON.parse(fee)[networkKey])
  )
}

function _assertFeeFetched(token: string): Cypress.Chainable {
  return _getChainFeeStorage(RINKEBY, token).then(feeQuoteData => {
    expect(feeQuoteData).to.exist
    expect(feeQuoteData).to.have.property(token)

    // THEN: The quote has the expected information
    const fee = feeQuoteData[token].fee
    _assertFeeData(fee)
  })
}

describe('Fee endpoint', () => {
  it('Returns the expected info', () => {
    // GIVEN: -
    // WHEN: Call fee API
    cy.request(getFeeQuery(WETH[4].address))
      .its('body')
      // THEN: The API response has the expected data
      .should(_assertFeeData)
  })
})

describe('Fee: Complex fetch and persist fee', () => {
  // Needs to run first to pass because of Cypress async issues between tests
  it('Re-fetched when it expires', () => {
    // GIVEN: input token Fee expiration is always 6 hours from now
    const SIX_HOURS = FOUR_HOURS * 1.5
    const LATER_TIME = new Date(Date.now() + SIX_HOURS).toISOString()
    const LATER_FEE = {
      expirationDate: LATER_TIME,
      minimalFee: '0',
      feeRatio: 0
    }

    // set the Cypress clock to now (default is UNIX 0)
    // only override Date functions (default is to override all time based functions)
    cy.clock(Date.now(), ['Date'])
    cy.stubResponse({ url: getFeeQuery(WETH[4].address), alias: 'feeRequest', body: LATER_FEE })

    // GIVEN: user visits app and goes AFK
    cy.visit('/swap')

    // WHEN: The user comes back 4h later (so the fee quote is expired) (after a long sandwich eating sesh, dude was hungry)
    cy.tick(FOUR_HOURS).then($clock => {
      // Stub the API fee response to return LATER_FEE

      // THEN: a new fee request is made AHEAD of current (advanced) time
      cy.wait('@feeRequest')
        .its('response.body')
        .then($body => {
          const body = JSON.parse($body)
          // @ts-expect-error - cypress untyped method
          const mockedTime = new Date($clock.details().now)

          // THEN: fee time is properly stubbed and
          expect(body.expirationDate).to.equal(LATER_TIME)
          // THEN: the mocked later date is indeed less than the new fee (read: the fee is valid)
          expect(new Date(body.expirationDate)).to.be.greaterThan(mockedTime)
        })

      // Stupid hack to give teardown time for next test block
      // Doesn't work without this, don't have anything to back this up beyond I know it works with and doesn't without it
      cy.wait(2000)
    })
  })
})

describe('Fee: simple checks it exists', () => {
  beforeEach(() => {
    _getLocalStorage().then($window => $window.clear())
    cy.visit('/app')
  })
  it('Fetch fee automatically on load', () => {
    // GIVEN: A user loads the swap page
    // WHEN: He does nothing
    // THEN: The fee for ETH is fetched
    _assertFeeFetched('ETH')
  })

  it('Fetch fee when selecting token', () => {
    // GIVEN: A user loads the swap page
    // WHEN: Select DAI token
    cy.swapSelectToken(DAI, 'input')

    // THEN: The fee for DAI is fetched
    _assertFeeFetched(DAI)
  })
})

describe('Swap: Considering fee', () => {
  const INPUT_TOKEN = DAI

  const FUTURE_EXPIRATION_DATE = new Date(Date.now() + FOUR_HOURS).toISOString()
  const EXACT_IN_INPUT = '#swap-currency-input .token-amount-input'
  const EXACT_OUT_INPUT = '#swap-currency-output .token-amount-input'

  beforeEach(() => {
    _getLocalStorage().then($window => $window.clear())
    cy.visit('/swap')
  })

  it("Uses Uniswap price, if there's no tip", () => {
    // GIVEN: No fee
    const TYPED_AMOUNT = '1'
    const ZERO_FEE = {
      // pass later date to not trigger refetch
      expirationDate: FUTURE_EXPIRATION_DATE,
      minimalFee: '0',
      feeRatio: 0
    }

    // Set up stubbing on any calls to token fee API using passed in fee arg as response
    // Visit app and get test started
    cy.stubResponse({ url: getFeeQuery(INPUT_TOKEN), alias: 'feeRequest', body: ZERO_FEE })

    // GIVEN: Swap ETH for DAI
    cy.swapSelectToken(INPUT_TOKEN, 'input')
    cy.swapSelectToken(WETH[4].address, 'output')

    // We need to wait here for the API request to go out AFTER the user selects DAI as an input token
    // as the app is programmed to detect inputToken change and fetch fee
    cy.wait('@feeRequest')
      .its('response.body')
      // THEN: The API response has the expected data
      .then($body => _assertFeeData(JSON.parse($body), ['0', 0]))

    // WHEN: Users input amount
    cy.swapInputCheckOutput({
      inputName: EXACT_IN_INPUT,
      outputName: EXACT_OUT_INPUT,
      typedAmount: TYPED_AMOUNT
    })
      // THEN: user gets uniswap price
      // TODO: check actual price...
      .should('not.have.value', '')
  })

  it("User can't trade when amount is smaller than minimumFee", () => {
    // GIVEN: 5 minimum fee and small input amount
    const TYPED_AMOUNT = '1'
    const FEE = {
      expirationDate: FUTURE_EXPIRATION_DATE,
      // fee is in ATOMS
      minimalFee: parseUnits('5', 18).toString(),
      feeRatio: 0
    }
    // Set up stubbing on any calls to token fee API using passed in fee arg as response
    // Visit app and get test started
    cy.stubResponse({ url: getFeeQuery(INPUT_TOKEN), alias: 'fee', body: FEE })

    // GIVEN: Swap WETH for DAI
    cy.swapSelectToken(INPUT_TOKEN, 'input')
    cy.swapSelectToken(WETH[4].address, 'output')

    cy.swapInputCheckOutput({
      inputName: EXACT_IN_INPUT,
      outputName: EXACT_OUT_INPUT,
      // GIVEN: amount is smaller than minimumFee
      // WHEN: Users input amount
      typedAmount: TYPED_AMOUNT
    })
      // THEN: cannot trade
      .should('have.value', '')
  })

  it('User pays minimumFee for small trades', () => {
    // GIVEN: amount is bigger than minimumFee, but trade is still small
    const TYPED_AMOUNT = '1'
    const FEE = {
      expirationDate: FUTURE_EXPIRATION_DATE,
      minimalFee: parseUnits('0.5', 18).toString(),
      feeRatio: 0
    }
    // Set up stubbing on any calls to token fee API using passed in fee arg as response
    cy.stubResponse({ url: getFeeQuery(INPUT_TOKEN), alias: 'fee', body: FEE })

    // GIVEN: Swap ETH for DAI
    cy.swapSelectToken(INPUT_TOKEN, 'input')
    cy.swapSelectToken(WETH[4].address, 'output')

    // WHEN: Users input amount
    cy.swapInputCheckOutput({
      inputName: EXACT_IN_INPUT,
      outputName: EXACT_OUT_INPUT,
      typedAmount: TYPED_AMOUNT
    })
      // THEN: He gets Uniswap price minus minimal-trade
      // TODO: get actual numbers
      .should(([$input]: any) => {
        const inputValue = Number($input.value)
        expect(inputValue).to.be.greaterThan(0)
      })
  })

  it('User pays more than minimumFee for big trades', () => {
    // GIVEN: Swap WETH-DAI
    // GIVEN: amount * "fee factor" is bigger than minimumFee
    // WHEN: Users input amount
    const TYPED_AMOUNT = '1'
    const FEE = {
      expirationDate: FUTURE_EXPIRATION_DATE,
      minimalFee: parseUnits('0.1', 18).toString(),
      // 99% fee
      feeRatio: 9999
    }
    // Set up stubbing on any calls to token fee API using passed in fee arg as response
    cy.stubResponse({ url: getFeeQuery(INPUT_TOKEN), alias: 'fee', body: FEE })

    cy.swapSelectToken(INPUT_TOKEN, 'input')
    cy.swapSelectToken(WETH[4].address, 'output')

    // WHEN: Users input amount
    cy.swapInputCheckOutput({
      inputName: EXACT_IN_INPUT,
      outputName: EXACT_OUT_INPUT,
      typedAmount: TYPED_AMOUNT
    })
      // THEN: He gets Uniswap price minus amount * "fee factor"
      // TODO: get actual numbers
      .should(([$input]: any) => {
        const inputValue = Number($input.value)
        expect(inputValue).to.be.greaterThan(0)
      })
  })
})
