import { major } from 'semver';
import { version } from '../package.json';

export const IS_V1_RELEASE = major(version) > 0;

export const RESTRICT_FILE_ACCESS_TO = 'N8N_RESTRICT_FILE_ACCESS_TO';
export const BLOCK_FILE_ACCESS_TO_N8N_FILES = 'N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES';
export const CONFIG_FILES = 'N8N_CONFIG_FILES';
export const BINARY_DATA_STORAGE_PATH = 'N8N_BINARY_DATA_STORAGE_PATH';
export const UM_EMAIL_TEMPLATES_INVITE = 'N8N_UM_EMAIL_TEMPLATES_INVITE';
export const UM_EMAIL_TEMPLATES_PWRESET = 'N8N_UM_EMAIL_TEMPLATES_PWRESET';
