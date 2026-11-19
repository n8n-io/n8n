import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const applicationId = '6f1e2d3c-4b5a-4968-8776-a5b4c3d2e1f0';
const certificateIssuingTemplateId = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const certificateSigningRequest =
	'-----BEGIN CERTIFICATE REQUEST-----\nMIIB\n-----END CERTIFICATE REQUEST-----';
const requestId = '0b7a5f2e-9c1d-4e3f-8a6b-2d4c6e8f0a1b';
const createdRequestId = '8e0b2d4f-6a7c-4e1a-9c5e-0d2f4b6c8a0e';
const deletedCertificateId = '3c5e7a9b-1d2f-4a6c-8e0b-5f7a9c1e3d5b';
const downloadCertificateId = '4d6f8b0c-2e3a-4b7d-9f1c-6a8b0d2f4e6c';
const keystoreCertificateId = '5e7a9c1d-3f4b-4c8e-8a2d-7b9c1e3a5f7d';
const certificateId = '6f8b0d2e-4a5c-4d9f-9b3e-8c0d2f4b6a8e';

describe('Venafi TLS Protect Cloud > Workflows', () => {
	const credentials = {
		venafiTlsProtectCloudApi: {
			region: 'eu',
			apiKey: 'fake-api-key',
		},
	};

	beforeAll(() => {
		const mock = nock('https://api.venafi.eu');
		mock
			.post('/outagedetection/v1/certificaterequests', {
				applicationId,
				certificateIssuingTemplateId,
				isVaaSGenerated: false,
				certificateSigningRequest,
			})
			.reply(200, { certificateRequests: [{ id: createdRequestId, status: 'ISSUED' }] });
		mock
			.get(`/outagedetection/v1/certificaterequests/${requestId}`)
			.reply(200, { id: requestId, status: 'ISSUED' });
		mock.get('/outagedetection/v1/certificaterequests').reply(200, {
			certificateRequests: [{ id: requestId }],
			_links: [{ Next: '/outagedetection/v1/certificaterequests?page=1' }],
		});
		mock
			.get('/outagedetection/v1/certificaterequests')
			.query({ page: 1 })
			.reply(200, { certificateRequests: [{ id: createdRequestId }] });
		mock
			.post('/outagedetection/v1/certificates/deletion', {
				certificateIds: [deletedCertificateId],
			})
			.reply(200, { certificates: [{ id: deletedCertificateId, certificateStatus: 'DELETED' }] });
		mock
			.get(`/outagedetection/v1/certificates/${downloadCertificateId}/contents`)
			.reply(200, '-----BEGIN CERTIFICATE-----', {
				'content-disposition': 'attachment; filename="www.example.com.pem"',
			});
		mock
			.get(`/outagedetection/v1/certificates/${keystoreCertificateId}`)
			.reply(200, { id: keystoreCertificateId, dekHash: 'dek-hash-1' });
		mock
			.get('/v1/edgeencryptionkeys/dek-hash-1')
			.reply(200, { key: Buffer.alloc(32, 7).toString('base64') });
		mock
			.post(
				`/outagedetection/v1/certificates/${keystoreCertificateId}/keystore`,
				(body: { exportFormat: string; certificateLabel: string }) =>
					body.exportFormat === 'PEM' && body.certificateLabel === 'www',
			)
			.reply(200, 'keystore', {
				'content-disposition': 'attachment; filename="www.example.com.zip"',
			});
		mock
			.get(`/outagedetection/v1/certificates/${certificateId}`)
			.reply(200, { id: certificateId, certificateName: 'www.example.com' });
		mock
			.get('/outagedetection/v1/certificates')
			.query({ limit: 2 })
			.reply(200, { certificates: [{ id: certificateId }, { id: deletedCertificateId }] });
		mock
			.post('/outagedetection/v1/certificaterequests', {
				certificateSigningRequest,
				certificateIssuingTemplateId,
				applicationId,
				existingCertificateId: certificateId,
			})
			.reply(200, {
				certificateRequests: [{ id: '9f1c3e5a-7b8d-4f2b-8d6f-1e3a5c7d9b1f', status: 'REQUESTED' }],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
