const PayPalNodeModule = require('../../../nodes/PayPal/PayPal.node.ts')

describe('testCredentials', () => {
  let node = new PayPalNodeModule.PayPal()
  const mockSuccessfulResponse = {"access_token": "ABC"}
  const expectedSandboxUri = "https://api-m.sandbox.paypal.com/v1/oauth2/token"
  const expectedLiveUri = "https://api-m.paypal.com/v1/oauth2/token"
  let called = []


  let mockCredentials = {
    id: 1,
    name: "test",
    type: "payPalApi",
    nodesAccess: [],
    data: {
      "clientId": "mockId",
      "secret": "mockSecret",
      "env": "sanbox"
    }
  }

  it('Method exists', async () => {

    expect(node.methods.credentialTest.payPalApiTest).toBeTruthy()

  })

  function patchHelper(node, response, error) {
    called = []
    function mockRequest(options) {
      console.log(options)
      called.push(options)
      if (error) {
        throw new Error("Mocked error")
      }
      return mockSuccessfulResponse
    }
    node.methods.credentialTest.helpers = {request: mockRequest}
  }

  it('Calls Mocked API Sandbox Environment', async () => {

    patchHelper(node, mockSuccessfulResponse)

    result = await node.methods.credentialTest.payPalApiTest(mockCredentials)

    expect(result).toEqual({
      status: 'OK',
      message: 'Authentication successful!',
    })
    expect(called[0].uri).toEqual(expectedSandboxUri)
  })

  it('Calls Mocked API Live Environment', async () => {

    patchHelper(node, mockSuccessfulResponse)

    mockCredentials.data.env = "live"
    result = await node.methods.credentialTest.payPalApiTest(mockCredentials)

    expect(result).toEqual({
      status: 'OK',
      message: 'Authentication successful!',
    })
    expect(called[0].uri).toEqual(expectedLiveUri)
  })

  it('Calls Mocked API Raises Error', async () => {

    patchHelper(node, {}, true)

    result = await node.methods.credentialTest.payPalApiTest(mockCredentials)

    expect(result).toEqual({
      status: 'Error',
      message: 'Connection details not valid: Mocked error',
    })
  })

  it('Calls Mocked Invalid Input', async () => {

    mockCredentials.data.secret = undefined
    
    result = await node.methods.credentialTest.payPalApiTest(mockCredentials)

    expect(result).toEqual({
      status: 'Error',
      message: 'Connection details not valid: missing credentials',
    })
  })
})

