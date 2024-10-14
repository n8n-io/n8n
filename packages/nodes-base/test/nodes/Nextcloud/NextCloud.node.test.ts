import { NodeOperationError } from 'n8n-workflow';
import { NextCloud } from '../NextCloud';
import * as GenericFunctions from '../GenericFunctions';

describe('NextCloud Node', () => {
  let node: NextCloud;
  let executeFunctions: any;

  beforeEach(() => {
    node = new NextCloud();
    executeFunctions = {
      getNodeParameter: jest.fn(),
      getCredentials: jest.fn(),
      helpers: {
        requestWithAuthentication: jest.fn(),
        assertBinaryData: jest.fn(),
        getBinaryDataBuffer: jest.fn(),
        prepareBinaryData: jest.fn(),
        constructExecutionMetaData: jest.fn(),
      },
      continueOnFail: jest.fn().mockReturnValue(false),
      getInputData: jest.fn().mockReturnValue([]),
      getNode: jest.fn(),
    };
  });

  describe('Deck Operations', () => {
    it('should create a new Deck board', async () => {
      // Mock node parameters
      executeFunctions.getNodeParameter.mockImplementation((param, index) => {
        const params = {
          authentication: 'accessToken',
          resource: 'deck',
          operation: 'createBoard',
          boardName: 'Project Management',
        };
        return params[param];
      });

      // Mock credentials
      executeFunctions.getCredentials.mockResolvedValue({
        webDavUrl: 'https://example.com/nextcloud',
      });

      // Mock API response
      const mockResponse = JSON.stringify({
        ocs: {
          meta: {
            status: 'ok',
          },
          data: {
            id: '12345',
            name: 'Project Management',
          },
        },
      });

      executeFunctions.helpers.requestWithAuthentication = jest.fn().mockResolvedValue(mockResponse);

      // Execute the node
      const result = await node.execute.call(executeFunctions);

      // Assertions
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('resource', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('operation', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('boardName', 0);
      expect(executeFunctions.getCredentials).toHaveBeenCalledWith('nextCloudApi');
      expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
        'POST',
        'ocs/v2.php/apps/deck/api/v1.0/boards',
        JSON.stringify({ name: 'Project Management' }),
        {
          'OCS-APIRequest': 'true',
          'Content-Type': 'application/json',
        }
      );
      expect(result[0][0].json).toEqual({
        id: '12345',
        name: 'Project Management',
      });
    });

    it('should handle API error when creating a Deck board', async () => {
      // Mock node parameters
      executeFunctions.getNodeParameter.mockImplementation((param, index) => {
        const params = {
          authentication: 'accessToken',
          resource: 'deck',
          operation: 'createBoard',
          boardName: 'Project Management',
        };
        return params[param];
      });

      // Mock credentials
      executeFunctions.getCredentials.mockResolvedValue({
        webDavUrl: 'https://example.com/nextcloud',
      });

      // Mock API error response
      const mockErrorResponse = JSON.stringify({
        ocs: {
          meta: {
            status: 'failure',
            message: 'Board creation failed',
          },
          data: {},
        },
      });

      executeFunctions.helpers.requestWithAuthentication = jest.fn().mockResolvedValue(mockErrorResponse);

      // Execute the node and expect an error
      await expect(node.execute.call(executeFunctions)).rejects.toThrow(NodeOperationError);
    });
  });

  describe('Notes Operations', () => {
    it('should create a new Note', async () => {
      // Mock node parameters
      executeFunctions.getNodeParameter.mockImplementation((param, index) => {
        const params = {
          authentication: 'accessToken',
          resource: 'notes',
          operation: 'createNote',
          content: 'Meeting notes...',
        };
        return params[param];
      });

      // Mock credentials
      executeFunctions.getCredentials.mockResolvedValue({
        webDavUrl: 'https://example.com/nextcloud',
      });

      // Mock API response
      const mockResponse = JSON.stringify({
        ocs: {
          meta: {
            status: 'ok',
          },
          data: {
            id: '67890',
            content: 'Meeting notes...',
          },
        },
      });

      executeFunctions.helpers.requestWithAuthentication = jest.fn().mockResolvedValue(mockResponse);

      // Execute the node
      const result = await node.execute.call(executeFunctions);

      // Assertions
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('resource', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('operation', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('content', 0);
      expect(executeFunctions.getCredentials).toHaveBeenCalledWith('nextCloudApi');
      expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
        'POST',
        'ocs/v1.php/apps/notes/api/v1/notes',
        JSON.stringify({ content: 'Meeting notes...' }),
        {
          'OCS-APIRequest': 'true',
          'Content-Type': 'application/json',
        }
      );
      expect(result[0][0].json).toEqual({
        id: '67890',
        content: 'Meeting notes...',
      });
    });

    it('should handle API error when creating a Note', async () => {
      // Mock node parameters
      executeFunctions.getNodeParameter.mockImplementation((param, index) => {
        const params = {
          authentication: 'accessToken',
          resource: 'notes',
          operation: 'createNote',
          content: 'Meeting notes...',
        };
        return params[param];
      });

      // Mock credentials
      executeFunctions.getCredentials.mockResolvedValue({
        webDavUrl: 'https://example.com/nextcloud',
      });

      // Mock API error response
      const mockErrorResponse = JSON.stringify({
        ocs: {
          meta: {
            status: 'failure',
            message: 'Note creation failed',
          },
          data: {},
        },
      });

      executeFunctions.helpers.requestWithAuthentication = jest.fn().mockResolvedValue(mockErrorResponse);

      // Execute the node and expect an error
      await expect(node.execute.call(executeFunctions)).rejects.toThrow(NodeOperationError);
    });
  });

  // Repeat similar test suites for Tables and Talk operations

  describe('Tables Operations', () => {
    it('should create a new Table', async () => {
      // Mock node parameters
      executeFunctions.getNodeParameter.mockImplementation((param, index) => {
        const params = {
          authentication: 'accessToken',
          resource: 'tables',
          operation: 'createTable',
          tableName: 'Project Tasks',
        };
        return params[param];
      });

      // Mock credentials
      executeFunctions.getCredentials.mockResolvedValue({
        webDavUrl: 'https://example.com/nextcloud',
      });

      // Mock API response
      const mockResponse = JSON.stringify({
        ocs: {
          meta: {
            status: 'ok',
          },
          data: {
            id: 'ABCDE',
            name: 'Project Tasks',
          },
        },
      });

      executeFunctions.helpers.requestWithAuthentication = jest.fn().mockResolvedValue(mockResponse);

      // Execute the node
      const result = await node.execute.call(executeFunctions);

      // Assertions
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('resource', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('operation', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('tableName', 0);
      expect(executeFunctions.getCredentials).toHaveBeenCalledWith('nextCloudApi');
      expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
        'POST',
        'ocs/v1.php/apps/tables/api/v1/tables',
        JSON.stringify({ name: 'Project Tasks' }),
        {
          'OCS-APIRequest': 'true',
          'Content-Type': 'application/json',
        }
      );
      expect(result[0][0].json).toEqual({
        id: 'ABCDE',
        name: 'Project Tasks',
      });
    });

    it('should handle API error when creating a Table', async () => {
      // Mock node parameters
      executeFunctions.getNodeParameter.mockImplementation((param, index) => {
        const params = {
          authentication: 'accessToken',
          resource: 'tables',
          operation: 'createTable',
          tableName: 'Project Tasks',
        };
        return params[param];
      });

      // Mock credentials
      executeFunctions.getCredentials.mockResolvedValue({
        webDavUrl: 'https://example.com/nextcloud',
      });

      // Mock API error response
      const mockErrorResponse = JSON.stringify({
        ocs: {
          meta: {
            status: 'failure',
            message: 'Table creation failed',
          },
          data: {},
        },
      });

      executeFunctions.helpers.requestWithAuthentication = jest.fn().mockResolvedValue(mockErrorResponse);

      // Execute the node and expect an error
      await expect(node.execute.call(executeFunctions)).rejects.toThrow(NodeOperationError);
    });
  });

  describe('Talk Operations', () => {
    it('should send a message in a conversation', async () => {
      executeFunctions.getNodeParameter.mockImplementation((param, index) => {
        const params = {
          authentication: 'accessToken',
          resource: 'talk',
          operation: 'sendMessage',
          conversationId: 'FGHIJ',
          message: 'Hello team!',
        };
        return params[param];
      });

      // Mock credentials
      executeFunctions.getCredentials.mockResolvedValue({
        webDavUrl: 'https://example.com/nextcloud',
      });

      // Mock API response
      const mockResponse = JSON.stringify({
        ocs: {
          meta: {
            status: 'ok',
          },
          data: {
            messageId: 'MSG123',
            message: 'Hello team!',
          },
        },
      });

      executeFunctions.helpers.requestWithAuthentication = jest.fn().mockResolvedValue(mockResponse);

      // Execute the node
      const result = await node.execute.call(executeFunctions);

      // Assertions
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('resource', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('operation', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('conversationId', 0);
      expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('message', 0);
      expect(executeFunctions.getCredentials).toHaveBeenCalledWith('nextCloudApi');
      expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
        'POST',
        'ocs/v1.php/apps/talk/api/v1/messages/FGHIJ',
        JSON.stringify({ message: 'Hello team!' }),
        {
          'OCS-APIRequest': 'true',
          'Content-Type': 'application/json',
        }
      );
      expect(result[0][0].json).toEqual({
        messageId: 'MSG123',
        message: 'Hello team!',
      });
    });

    it('should handle API error when sending a message in Talk', async () => {
      // Mock node parameters
      executeFunctions.getNodeParameter.mockImplementation((param, index) => {
        const params = {
          authentication: 'accessToken',
          resource: 'talk',
          operation: 'sendMessage',
          conversationId: 'FGHIJ',
          message: 'Hello team!',
        };
        return params[param];
      });

      executeFunctions.getCredentials.mockResolvedValue({
        webDavUrl: 'https://example.com/nextcloud',
      });

      // Mock API error response
      const mockErrorResponse = JSON.stringify({
        ocs: {
          meta: {
            status: 'failure',
            message: 'Message sending failed',
          },
          data: {},
        },
      });

      executeFunctions.helpers.requestWithAuthentication = jest.fn().mockResolvedValue(mockErrorResponse);

      // Execute the node and expect an error
      await expect(node.execute.call(executeFunctions)).rejects.toThrow(NodeOperationError);
    });
  });

  // Add similar test suites for File and Folder operations as needed
});
