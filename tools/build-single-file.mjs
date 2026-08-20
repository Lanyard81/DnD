// Reassembles app-src/ (shell + styles.css + js/*.js, in app-src/js-order.json
// order) into the single self-contained index.html that is the actual shipped
// deliverable. Zero npm dependencies — plain Node fs. Run after editing
// anything under app-src/:
//
//   node tools/build-single-file.mjs
//
// The shipped index.html has NO reference to app-src/ or this script; it is
// fully standalone, matching D1/D9 in DECISIONS.md.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const appSrc = path.join(root, 'app-src');
const jsDir = path.join(appSrc, 'js');

const head = fs.readFileSync(path.join(appSrc, 'shell.head.html'), 'utf8');
const styles = fs.readFileSync(path.join(appSrc, 'styles.css'), 'utf8');
const middle = fs.readFileSync(path.join(appSrc, 'shell.middle.html'), 'utf8');
const tail = fs.readFileSync(path.join(appSrc, 'shell.tail.html'), 'utf8');
const order = JSON.parse(fs.readFileSync(path.join(appSrc, 'js-order.json'), 'utf8'));

const jsBody = order.map(filename => fs.readFileSync(path.join(jsDir, filename), 'utf8').replace(/\s+$/, '')).join('\n\n');

const output = `${head}<style>\n${styles}</style>${middle}<script>\n${jsBody}\n</script>${tail}`;

fs.writeFileSync(path.join(root, 'index.html'), output, 'utf8');
console.log(`Built index.html from ${order.length} JS chunks (${jsBody.split('\n').length} script lines).`);
