import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetFile = path.resolve(
  __dirname,
  '../node_modules/@capgo/capacitor-updater/android/src/main/java/ee/forgr/capacitor_updater/DelayUpdateUtils.java'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  const original = content;
  content = content
    .replace('case DelayUntilNext.background:', 'case background:')
    .replace('case DelayUntilNext.kill:', 'case kill:')
    .replace('case DelayUntilNext.date:', 'case date:')
    .replace('case DelayUntilNext.nativeVersion:', 'case nativeVersion:');
  if (content !== original) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('Successfully patched @capgo/capacitor-updater DelayUpdateUtils.java');
  }
}
