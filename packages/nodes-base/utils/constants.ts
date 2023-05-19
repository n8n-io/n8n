import { major } from 'semver';
import { version } from '../package.json';

export const IS_V1_RELEASE = major(version) > 0;
