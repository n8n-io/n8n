#!/usr/bin/env tsx
/**
 * Run all janitor rule tests
 */

import './boundary-protection.rule.test';
import './scope-lockdown.rule.test';
import './selector-purity.rule.test';
import './deduplication.rule.test';
import './dead-code.rule.test';
import './api-purity.rule.test';
import './no-page-in-composable.rule.test';
import './test-data-hygiene.rule.test';

console.log('====================================');
console.log('All Janitor Rule Tests Complete');
console.log('====================================\n');
