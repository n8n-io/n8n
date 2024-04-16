import type { IRequestOptions } from 'n8n-workflow';
import { prepareRequestBody, setAgentOptions } from '../../GenericFunctions';
import type { BodyParameter, BodyParametersReducer } from '../../GenericFunctions';

describe('HTTP Node Utils, prepareRequestBody', () => {
	it('should call default reducer', async () => {
		const bodyParameters: BodyParameter[] = [
			{
				name: 'foo.bar',
				value: 'baz',
			},
		];
		const defaultReducer: BodyParametersReducer = jest.fn();

		await prepareRequestBody(bodyParameters, 'json', 3, defaultReducer);

		expect(defaultReducer).toBeCalledTimes(1);
		expect(defaultReducer).toBeCalledWith({}, { name: 'foo.bar', value: 'baz' });
	});

	it('should call process dot notations', async () => {
		const bodyParameters: BodyParameter[] = [
			{
				name: 'foo.bar.spam',
				value: 'baz',
			},
		];
		const defaultReducer: BodyParametersReducer = jest.fn();

		const result = await prepareRequestBody(bodyParameters, 'json', 4, defaultReducer);

		expect(defaultReducer).toBeCalledTimes(0);
		expect(result).toBeDefined();
		expect(result).toEqual({ foo: { bar: { spam: 'baz' } } });
	});
});

describe('HTTP Node Utils, setAgentOptions', () => {
	it("should not have agentOptions as it's undefined", async () => {
		const requestOptions: IRequestOptions = {
			method: 'GET',
			uri: 'https://example.com',
		};

		const sslCertificates = undefined;

		setAgentOptions(requestOptions, sslCertificates);

		expect(requestOptions).toEqual({
			method: 'GET',
			uri: 'https://example.com',
		});
	});
	it('should have agentOptions set', async () => {
		const requestOptions: IRequestOptions = {
			method: 'GET',
			uri: 'https://example.com',
		};

		const sslCertificates = {
			ca: '-----BEGIN CERTIFICATE----- MIIDkzCCAnugAwIBAgIUMSLEzahP0dHVcxwUtMGBKKIrmBQwDQYJKoZIhvcNAQEL BQAwWTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDESMBAGA1UEAwwJbG9jYWxob3N0MB4X DTI0MDQxNTExMDYwNFoXDTI0MDUxNTExMDYwNFowWTELMAkGA1UEBhMCQVUxEzAR BgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0IFdpZGdpdHMgUHR5 IEx0ZDESMBAGA1UEAwwJbG9jYWxob3N0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A MIIBCgKCAQEAuTtIHsMtWvqTXKIj4hlMwxBj0RaGomACWxx1QrrMN478kWyWzzAk m725DVDCcKVVxu2FwsfWuReFSHNXfr1zyBNIhqAzKHA5LNBVPJ1r95Ecl0hlT1/5 hhQwKv6VHNsZV1WyVBtZNF/yEQBYkiUAjxC5fLjUc2NptUK7/lwoACCfCyOTFsx3 vmrxGbzewKn9Momoy+n67JErPpM/spf4CggL1dJw1nkZbiIa26OOpyCzj0aL0q+w +3xdoI8OOxaxtE72CqOdvVa+WSZaEE/hnelUwm/oJLdTZOQpGA3tnfziEL7a6bEC f94s2Zn5M1LeafYodVdDfeJqGDaDLJjkRQIDAQABo1MwUTAdBgNVHQ4EFgQUIoo6 igc93d8MNGtKbjT/dfpmNYYwHwYDVR0jBBgwFoAUIoo6igc93d8MNGtKbjT/dfpm NYYwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAcu+afpYCp0S7 YaDA6aoMcRY3qqbf56w6XCXIhvrFYR/recuwNPzmp1kIXS0b8CRsd8aDN3YE4o4V +mqCnsjrQB3y/uHOmXNMUD4UKGYsyiwCMDi0611mz/MjhtfZIubml8YJr62hB94b wosQmRBbbtio2e9NS+CHMwJlgVUSu+9TBTwgsSZZ6Temlm/m7jqQTFAmjn+852BX ww2E1kvI4HYRlELSGeWO9bCZvhROhV+ZEH7b1v58Z0RD4gE29tdnBYQKRfRTBMth g5uagkgMAx0TyfARX88zJbvZrg7sabYjE+DA5PKw3ePrnic+f1QmLhcedrsR/UgV a16pVsv+lA== -----END CERTIFICATE-----',
			cert: '',
			key: '',
			passphrase: '',
		};

		setAgentOptions(requestOptions, sslCertificates);

		expect(requestOptions).toStrictEqual({
			method: 'GET',
			uri: 'https://example.com',
			agentOptions: {
				cert: undefined,
				ca: '-----BEGIN CERTIFICATE-----\nMIIDkzCCAnugAwIBAgIUMSLEzahP0dHVcxwUtMGBKKIrmBQwDQYJKoZIhvcNAQEL\nBQAwWTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM\nGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDESMBAGA1UEAwwJbG9jYWxob3N0MB4X\nDTI0MDQxNTExMDYwNFoXDTI0MDUxNTExMDYwNFowWTELMAkGA1UEBhMCQVUxEzAR\nBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0IFdpZGdpdHMgUHR5\nIEx0ZDESMBAGA1UEAwwJbG9jYWxob3N0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\nMIIBCgKCAQEAuTtIHsMtWvqTXKIj4hlMwxBj0RaGomACWxx1QrrMN478kWyWzzAk\nm725DVDCcKVVxu2FwsfWuReFSHNXfr1zyBNIhqAzKHA5LNBVPJ1r95Ecl0hlT1/5\nhhQwKv6VHNsZV1WyVBtZNF/yEQBYkiUAjxC5fLjUc2NptUK7/lwoACCfCyOTFsx3\nvmrxGbzewKn9Momoy+n67JErPpM/spf4CggL1dJw1nkZbiIa26OOpyCzj0aL0q+w\n+3xdoI8OOxaxtE72CqOdvVa+WSZaEE/hnelUwm/oJLdTZOQpGA3tnfziEL7a6bEC\nf94s2Zn5M1LeafYodVdDfeJqGDaDLJjkRQIDAQABo1MwUTAdBgNVHQ4EFgQUIoo6\nigc93d8MNGtKbjT/dfpmNYYwHwYDVR0jBBgwFoAUIoo6igc93d8MNGtKbjT/dfpm\nNYYwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAcu+afpYCp0S7\nYaDA6aoMcRY3qqbf56w6XCXIhvrFYR/recuwNPzmp1kIXS0b8CRsd8aDN3YE4o4V\n+mqCnsjrQB3y/uHOmXNMUD4UKGYsyiwCMDi0611mz/MjhtfZIubml8YJr62hB94b\nwosQmRBbbtio2e9NS+CHMwJlgVUSu+9TBTwgsSZZ6Temlm/m7jqQTFAmjn+852BX\nww2E1kvI4HYRlELSGeWO9bCZvhROhV+ZEH7b1v58Z0RD4gE29tdnBYQKRfRTBMth\ng5uagkgMAx0TyfARX88zJbvZrg7sabYjE+DA5PKw3ePrnic+f1QmLhcedrsR/UgV\na16pVsv+lA==\n-----END CERTIFICATE-----',
				key: undefined,
				passphrase: undefined,
			},
		});
	});
});
