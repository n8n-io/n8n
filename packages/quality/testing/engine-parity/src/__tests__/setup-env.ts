import { afterAll } from 'vitest';

import { useTestUserFolder } from '../runners/user-folder';

afterAll(useTestUserFolder());
