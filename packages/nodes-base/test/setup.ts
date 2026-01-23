import 'reflect-metadata';
import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';

// Disable task runners until we have fixed the "run test workflows" test
// to mock the Code Node execution
const taskRunnersConfig = new TaskRunnersConfig();
taskRunnersConfig.enabled = false;
Container.set(TaskRunnersConfig, taskRunnersConfig);

process.env.N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = 'false';
process.env.N8N_VERSION = '0.0.0-test';
// Disable file access restrictions for tests so they can read/write test files
process.env.N8N_RESTRICT_FILE_ACCESS_TO = '';
