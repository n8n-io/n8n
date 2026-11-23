import { useTestUserFolder } from './user-folder';

/** Import this module before any module that loads n8n-core. */
export const removeTestUserFolder = useTestUserFolder();
