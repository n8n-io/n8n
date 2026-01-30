import ntlm from 'httpntlm/ntlm';
import ntlmAuthProcessor from '@utils/nodemailer-ntlm-auth';

jest.mock('httpntlm/ntlm');

describe('ntlmAuthProcessor', () => {
	let mockCtx: any;
	let mockNtlm: jest.Mocked<typeof ntlm>;

	beforeEach(() => {
		mockNtlm = ntlm as jest.Mocked<typeof ntlm>;

		mockCtx = {
			auth: {
				credentials: {
					user: 'testuser',
					pass: 'testpass',
					options: {
						domain: 'testdomain',
						workstation: 'testworkstation',
					},
				},
			},
			sendCommand: jest.fn(),
		};

		jest.clearAllMocks();
	});

	it('must be auth successfully', async () => {
		const mockType1Message = 'NTLM TlRMTVNTUAABAAAAB4IIAAAAAAAgAAAAAAAAACAAAAA=';
		const mockType2Message = {
			targetName: 'TESTDOMAIN',
			targetInfo: {},
		};
		const mockType3Message = 'NTLM TlRMTVNTUAADAAAAGAAYAFgAAAAYABgAcAAAAA==';
		const trimmedType3Message = 'TlRMTVNTUAADAAAAGAAYAFgAAAAYABgAcAAAAA==';

		mockNtlm.createType1Message.mockReturnValue(mockType1Message);
		mockNtlm.parseType2Message.mockReturnValue(mockType2Message);
		mockNtlm.createType3Message.mockReturnValue(mockType3Message);

		mockCtx.sendCommand
			.mockResolvedValueOnce({
				status: 334,
				text: 'NTLM ' + 'challengeString',
			})
			.mockResolvedValueOnce({
				status: 235,
			});

		// Act
		const result = await ntlmAuthProcessor(mockCtx);

		// Assert
		expect(result).toBe(true);
		expect(mockNtlm.createType1Message).toHaveBeenCalledWith({
			domain: 'testdomain',
			workstation: 'testworkstation',
		});
		expect(mockCtx.sendCommand).toHaveBeenNthCalledWith(1, 'AUTH ' + mockType1Message);
		expect(mockNtlm.parseType2Message).toHaveBeenCalledWith(
			'NTLM challengeString',
			expect.any(Function),
		);
		expect(mockNtlm.createType3Message).toHaveBeenCalledWith(mockType2Message, {
			domain: 'testdomain',
			workstation: 'testworkstation',
			username: 'testuser',
			password: 'testpass',
		});
		expect(mockCtx.sendCommand).toHaveBeenNthCalledWith(2, trimmedType3Message);
	});

	it("must add NTLM prefix if it doesn't have in challengeString", async () => {
		// Arrange
		const mockType1Message = 'NTLM type1';
		const mockType2Message = {
			targetName: 'TESTDOMAIN',
			targetInfo: {},
		};
		const mockType3Message = 'NTLM type3';

		mockNtlm.createType1Message.mockReturnValue(mockType1Message);
		mockNtlm.parseType2Message.mockReturnValue(mockType2Message);
		mockNtlm.createType3Message.mockReturnValue(mockType3Message);

		mockCtx.sendCommand
			.mockResolvedValueOnce({
				status: 334,
				text: 'challengeWithoutPrefix', // Без префикса NTLM
			})
			.mockResolvedValueOnce({
				status: 235,
			});

		// Act
		await ntlmAuthProcessor(mockCtx);

		// Assert
		expect(mockNtlm.parseType2Message).toHaveBeenCalledWith(
			'NTLM challengeWithoutPrefix',
			expect.any(Function),
		);
	});

	it('domain и workstation parameters can be empty', async () => {
		// Arrange
		const mockType1Message = 'NTLM type1';
		const mockType2Message = {
			targetName: 'TESTDOMAIN',
			targetInfo: {},
		};
		const mockType3Message = 'NTLM type3';

		mockCtx.auth.credentials.options = {};

		mockNtlm.createType1Message.mockReturnValue(mockType1Message);
		mockNtlm.parseType2Message.mockReturnValue(mockType2Message);
		mockNtlm.createType3Message.mockReturnValue(mockType3Message);

		mockCtx.sendCommand
			.mockResolvedValueOnce({
				status: 334,
				text: 'NTLM challenge',
			})
			.mockResolvedValueOnce({
				status: 235,
			});

		// Act
		await ntlmAuthProcessor(mockCtx);

		// Assert
		expect(mockNtlm.createType1Message).toHaveBeenCalledWith({
			domain: '',
			workstation: '',
		});
		expect(mockNtlm.createType3Message).toHaveBeenCalledWith(mockType2Message, {
			domain: '',
			workstation: '',
			username: 'testuser',
			password: 'testpass',
		});
	});

	it('must throw an error if first response is not 334', async () => {
		// Arrange
		const mockType1Message = 'NTLM type1';
		mockNtlm.createType1Message.mockReturnValue(mockType1Message);

		mockCtx.sendCommand.mockResolvedValue({
			status: 500,
			text: 'Server Error',
		});

		// Act & Assert
		await expect(ntlmAuthProcessor(mockCtx)).rejects.toThrow(
			'Invalid login sequence while waiting for server challenge string',
		);
	});

	it('must throw an error if second response is not 235', async () => {
		// Arrange
		const mockType1Message = 'NTLM type1';
		const mockType2Message = {
			targetName: 'TESTDOMAIN',
			targetInfo: {},
		};
		const mockType3Message = 'NTLM type3';

		mockNtlm.createType1Message.mockReturnValue(mockType1Message);
		mockNtlm.parseType2Message.mockReturnValue(mockType2Message);
		mockNtlm.createType3Message.mockReturnValue(mockType3Message);

		mockCtx.sendCommand
			.mockResolvedValueOnce({
				status: 334,
				text: 'NTLM challenge',
			})
			.mockResolvedValueOnce({
				status: 500,
				text: 'Authentication failed',
			});

		// Act & Assert
		await expect(ntlmAuthProcessor(mockCtx)).rejects.toThrow(
			'Invalid login sequence while waiting for "235"',
		);
	});

	it('must rethrow an error in parseType2Message callback', async () => {
		// Arrange
		const mockType1Message = 'NTLM type1';
		const testError = new Error('Parse error');

		mockNtlm.createType1Message.mockReturnValue(mockType1Message);

		// Мокаем parseType2Message чтобы он вызывал callback с ошибкой
		mockNtlm.parseType2Message.mockImplementation((challenge, callback) => {
			if (callback) {
				callback(testError);
			}
			throw testError;
		});

		mockCtx.sendCommand.mockResolvedValue({
			status: 334,
			text: 'NTLM challenge',
		});

		// Act & Assert
		await expect(ntlmAuthProcessor(mockCtx)).rejects.toThrow('Parse error');
	});

	it('must correctly handle an empty options', async () => {
		// Arrange
		const mockType1Message = 'NTLM type1';
		const mockType2Message = {
			targetName: 'TESTDOMAIN',
			targetInfo: {},
		};
		const mockType3Message = 'NTLM type3';

		mockCtx.auth.credentials.options = undefined;

		mockNtlm.createType1Message.mockReturnValue(mockType1Message);
		mockNtlm.parseType2Message.mockReturnValue(mockType2Message);
		mockNtlm.createType3Message.mockReturnValue(mockType3Message);

		mockCtx.sendCommand
			.mockResolvedValueOnce({
				status: 334,
				text: 'NTLM challenge',
			})
			.mockResolvedValueOnce({
				status: 235,
			});

		// Act
		await ntlmAuthProcessor(mockCtx);

		// Assert
		expect(mockNtlm.createType1Message).toHaveBeenCalledWith({
			domain: '',
			workstation: '',
		});
		expect(mockNtlm.createType3Message).toHaveBeenCalledWith(mockType2Message, {
			domain: '',
			workstation: '',
			username: 'testuser',
			password: 'testpass',
		});
	});
});
