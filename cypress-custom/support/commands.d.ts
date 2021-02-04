/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable<Subject> {
    /**
     * Select token input in the swap page
     *
     * @example cy.swapSelectInput()
     */
    swapSelectToken(tokenAddress: string, type: 'input' | 'output'): Chainable<Subject>

    swapInputCheckOutput({
      inputName,
      outputName,
      typedAmount,
      expectedOutput
    }: {
      inputName: string
      outputName: string
      typedAmount: string
      expectedOutputRule?: string
      expectedOutput?: string
    }): Chainable<HTMLInputElement>

    /**
     * Set a stubbing intercept on route specified
     *
     * @example cy.stubResponse({ url: '/api/v1/someEndpoint/', alias: 'endpoint', body: { foo: 'foo' } })
     */
    stubResponse({ url, alias, body }: { url: string; alias?: string; body?: any }): Chainable<Subject>

    /**
     * Set a stubbing intercept on route specified and visit app
     *
     * @example cy.swapStubAndVisit({ query: '/api/v1/someEndpoint/', alias: 'endpoint', body: { foo: 'foo' }, visit: '/home' })
     */
    stubAndVisit({
      query,
      alias,
      body,
      visit
    }: {
      query: string
      alias?: string
      body?: any
      visit: string
    }): Chainable<Subject>
  }
}
