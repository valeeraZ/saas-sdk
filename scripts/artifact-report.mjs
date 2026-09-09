import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const files = readdirSync('artifacts').filter(p => /\.(tgz|whl)$/.test(p)).sort();
if (files.filter(p => p.endsWith('.tgz')).length !== 10 || files.filter(p => p.endsWith('.whl')).length !== 1) throw new Error('Expected ten npm tarballs and one wheel');
const artifacts = files.map(name => ({name, sha256: createHash('sha256').update(readFileSync(`artifacts/${name}`)).digest('hex')}));
writeFileSync('artifacts/SHA256SUMS', artifacts.map(p => `${p.sha256}  ${p.name}\n`).join(''));
writeFileSync('artifacts/build-report.json', JSON.stringify({commit: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(), node: process.version, platform: process.platform, architecture: process.arch, artifacts}, null, 2) + '\n');
