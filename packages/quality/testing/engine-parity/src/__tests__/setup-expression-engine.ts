import { afterAll, beforeAll } from 'vitest';

import { startExpressionEngine, stopExpressionEngine } from '../runners/expression-engine';

beforeAll(startExpressionEngine);
afterAll(stopExpressionEngine);
