const MagentoModule = require('../../../nodes/Magento/Magento2.node.ts')

describe('testCredentials', () => {
  let node = new MagentoModule.Magento2()
  const mockSuccessfulResponse = {}
  const mockHost = "http://hello.magento"
  const expectedEndpointCall = `${mockHost}/rest/default/V1/directory/countries`
  let called = []

  let mockCredentials = {
    id: 1,
    name: "test",
    type: "magento2Api",
    nodesAccess: [],
    data: {
      host: mockHost,
      accessToken: "ABC"
    }
  }

  it('Method exists', async () => {

    expect(node.methods.credentialTest.magento2ApiTest).toBeTruthy()

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

  it('Calls Mocked API', async () => {
    patchHelper(node, mockSuccessfulResponse)

    result = await node.methods.credentialTest.magento2ApiTest(mockCredentials)

    expect(result).toEqual({
      status: 'OK',
      message: 'Authentication successful!',
    })
    expect(called[0].uri).toEqual(expectedEndpointCall)
  })

  it('Calls Mocked API Raises Error', async () => {

    patchHelper(node, {}, true)

    result = await node.methods.credentialTest.magento2ApiTest(mockCredentials)

    expect(result).toEqual({
      status: 'Error',
      message: 'Connection details not valid: Mocked error',
    })
  })

  it('Invalid Input', async () => {

    mockCredentials.data.accessToken = undefined

    result = await node.methods.credentialTest.magento2ApiTest(mockCredentials)

    expect(result).toEqual({
      status: 'Error',
      message: 'Connection details not valid: missing credentials',
    })
  })
})

