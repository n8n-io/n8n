import { formatDateForUI } from '../packages/frontend/editor-ui/src/utils/formatters/dateFormatter.js';

const samples = [
  '2025-10-02T14:00:00Z',
  '2025-12-25T00:00:00Z',
  new Date().toISOString(),
];

for (const s of samples) {
  const formatted = formatDateForUI(s, 'Asia/Beirut');
  console.log(`INPUT: ${s}`);
  console.log('OUTPUT:', formatted);
  console.log('----------------------------');
}
