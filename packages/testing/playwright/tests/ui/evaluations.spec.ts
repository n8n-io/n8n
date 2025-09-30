import { expect, test } from '../../fixtures/base';

test.describe('Evaluations @capability:proxy', () => {
	test.beforeEach(async ({ n8n, proxyServer }) => {
		await proxyServer.clearAllExpectations();

		await n8n.goHome();
		await n8n.workflows.addResource.workflow();
	});

	test('should load evaluations workflow and execute twice', async ({ n8n, proxyServer }) => {
		await proxyServer.loadExpectations('evaluations');

		await n8n.api.credentials.createCredentialFromDefinition({
			name: 'Test Google Sheets',
			type: 'googleApi',
			data: {
				email: 'email@quickstart-1234.iam.gserviceaccount.com',
				// mock private key
				privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDx1//AaoSkyHYl
npqS3+uaePYhJXKD/T1h6zGThAUooN7ZzWK46nNcU1vghQMTlPMHfUTbl4xzZxEL
OYjyTPOKpwJvhmy44MU+zTQYJuUaU4dQuOCnnC61CL91Xy+8GJd7PvdUeVRWENWu
zzO825Fxeiy2qnbrOJfhYh+f9znwWM2R8/V6LIp1HSWNBU0h/NCesmVhGwTP2H/P
wGgFPzl9+effW8TgmAukVuZoG+z8pOiqJnZLgTOO++PLyM6UJe560UnAbv0yP4y5
lZ370XwOQ6gVIiB0+8Z2A3tJp6ackfoMfDYbuU+CAhFPqkdvXgbrYciUCr6fzINo
ImK6CcSDAgMBAAECggEAF0+XokdiI7QC11tzUMbuocQZDVbbs+c7/G08KRjnmmPv
NxU599L5baPHTlvj0QZhao5jjbsM2a7MkMVp8tkB/JJehLtzTVq1CHmlFNLi8Geu
ulQnq2A9jEuckMatBjdkmoeWNXlAbM9QmXn1ZbXQThzVpIHH1qJs2Veo7rVYy1bD
+hnzadyeXsHOC518wNAaF3b1UShybI3dlrHbXqqRmkOZP272IKfmvZ2KOcnFC+MT
cWLUGWBTq2YK+UJv09OXHEBnonrm18m2Sku+/PhFwjOiifIK/1MWILss60IB7dFm
7Fe7NAtYQMPZyDEqY5Xo+K4FwWYzfxfHPiJf7k0DqQKBgQD5Rz+HCZC8V5c1oK8/
1hGthyh5JdXxW7C8D1WVuo7W2OHrOJSDXjGhsxMjnKYdq/1YybJl9XpQSvZeumto
YazNiJqAexIlpmEHLW5gDtX3xpM0dujuJudTHYfveugtR8i/EZpWpFKv45/6Rm33
Yt2PaMjLuO7yW0buEjSQInHtHwKBgQD4XW44YujgF+xvMmx8+QyyNI2UNI1ZmnsU
VZLmDAn5+WDz5YtBXN9JGIXIk5279S7xzu9xyq7Ih6uedxE/hmzaHSZ1gl9Xasci
n86FGaGPm6RtEeZ8c68oqha7kddLoBwTPBoZq5NaCCaTh2TQkMPg+Ws3erM0pkyC
fqw1hzkYHQKBgQC2Iv3i3/VV+DXupCqIXRRrkx7abe/FO3aF4jppfXdSugNQR/YT
imZ/PIXWdmXVtk4VasIjx1oIgs1C57kE+qE1SAODrujSg5/Pi71jCFQEh54VLnEB
WYGZ9DDXpRkxxIqEOQtpFQWpqIrCZmWA5Ub3uttEJyrIADNyTfEEA3b0hwKBgHrn
STbQA2t5iz/PlQ4W9GhvRyxzAQu5PXTnj+UVSg6QkKDBE7NJsRjr8LA8FE9B2nRA
sg7+fJWxRYUKaNelvtIEoNZ/qIyKw3Zn3HvTHjcBj1GGDSfC24fk+5Dgb8j1t07x
a/0OAcIIzIYu9v2a1cPLyXnP10STksL0ymVGwEMlAoGBAK2dtYZllhooN/C4ssFW
nmfqICLWEc/UZSxmxau1rOz71GJiiHgXFmQgiZtpf3Qp3wKKtoFkf+sJ6zP2VX35
2tJcTO9lKm6kNa3eaveE/NJrkH5a0IpxrvDT1TvmnapaNEKuGZJAX5BNaggDrfEJ
m82JpEptTfAxFHtd8+Sb0U2G
-----END PRIVATE KEY-----`,
			},
		});

		// Import the evaluations workflow
		await n8n.canvas.importWorkflow('evaluations_loop.json', 'Evaluations');

		// Open each node to ensure credentials are set
		await n8n.canvas.openNode('When fetching a dataset row');
		await n8n.page.keyboard.press('Escape');

		// Open each node to ensure credentials are set
		await n8n.canvas.openNode('Set outputs');
		await n8n.page.keyboard.press('Escape');

		// Execute workflow from canvas - first execution
		await n8n.canvas.clickExecuteWorkflowButton();

		// wait for first run to finish
		await n8n.notifications.waitForNotificationAndClose('Successful', { timeout: 10000 });

		// wait for second run to finish
		await n8n.notifications.waitForNotificationAndClose('Successful', { timeout: 10000 });

		// 💡 To update recordings, remove stored expectations, set real credentials above and rerecord here.
		// await proxyServer.recordExpectations('evaluations', { host: 'google', dedupe: true });

		const batchUpdateRequests = (await proxyServer.getAllRequestsMade()).filter((request) => {
			const path = request.httpRequest?.path;
			const method = request.httpRequest?.method;

			return method === 'POST' && typeof path === 'string' && path.endsWith('/values:batchUpdate');
		});

		/**
		 * Original Table in Google Sheets
		 * The loop should execute twice over both rows here
		 * Incrementing each value by 1 (expression in Set Output node)
		 *
		 * name	  email	 actual
			 test	  test	 10
			 hello	wolrd	 104
		 */

		// Set output node was called twice in a loop, updating Google sheets output value
		expect(batchUpdateRequests.length).toEqual(2);
		expect((batchUpdateRequests[0]?.httpRequest?.body as { json: object })?.json).toEqual({
			data: [
				{
					range: 'Sheet2!C2',
					values: [[11]],
				},
			],
			valueInputOption: 'RAW',
		});
		expect((batchUpdateRequests[1]?.httpRequest?.body as { json: object })?.json).toEqual({
			data: [
				{
					range: 'Sheet2!C3',
					values: [[105]],
				},
			],
			valueInputOption: 'RAW',
		});
	});
});
