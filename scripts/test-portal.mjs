import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, realpathSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { run } from './workspace.mjs';
const root = resolve('.');
const fixture = JSON.parse(readFileSync('tests/fixtures/portal-baseline.json'));
const archive = resolve('tests/fixtures/portal-baseline.tar');
assert.equal(createHash('sha256').update(readFileSync(archive)).digest('hex'), fixture.sha256);
const consumer = realpathSync(mkdtempSync(join(tmpdir(), 'frame-portal-')));
run('tar', ['-xf', archive, '-C', consumer]);
for (const file of fixture.files) assert.equal(createHash('sha256').update(readFileSync(join(consumer, file.path))).digest('hex'), file.sha256, file.path);
const baselineLock = JSON.parse(readFileSync(join(consumer, 'package-lock.json')));
rmSync(join(consumer, 'package-lock.json'));
mkdirSync(join(consumer, 'artifacts'));
// registry-cache belongs to the old Portal, not the SDK extraction. Package it
// only inside this frozen compatibility fixture, then remove its source checkout.
const cache = join(consumer, 'packages/registry-cache');
const cacheManifest = JSON.parse(readFileSync(join(cache, 'package.json')));
cacheManifest.files = ['src'];
writeFileSync(join(cache, 'package.json'), JSON.stringify(cacheManifest, null, 2));
const [cachePack] = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', join(consumer, 'artifacts')], {cwd: cache, stdio: 'pipe'}));
rmSync(join(consumer, 'packages'), {recursive: true});
const metadata = JSON.parse(readFileSync('artifacts/npm-pack.json'));
const internal = Object.fromEntries(metadata.map(p => [p.name, `file:${join(root, 'artifacts', p.filename)}`]));
internal['@frame/registry-cache'] = `file:${join(consumer, 'artifacts', cachePack.filename)}`;
const app = join(consumer, 'apps/portal');
writeFileSync(join(app, 'tsconfig.base.json'), readFileSync(join(consumer, 'tsconfig.json')));
const tsconfig = JSON.parse(readFileSync(join(app, 'tsconfig.json')));
tsconfig.extends = './tsconfig.base.json';
writeFileSync(join(app, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
const manifest = JSON.parse(readFileSync(join(app, 'package.json')));
for (const group of ['dependencies', 'devDependencies']) {
  for (const name of Object.keys(manifest[group] ?? {})) {
    if (internal[name]) manifest[group][name] = internal[name];
    else {
      const locked = baselineLock.packages[`apps/portal/node_modules/${name}`] ?? baselineLock.packages[`node_modules/${name}`];
      assert.ok(locked?.version, `No baseline version for ${name}`);
      manifest[group][name] = locked.version;
    }
  }
}
manifest.dependencies = {...manifest.dependencies, ...internal};
writeFileSync(join(app, 'package.json'), JSON.stringify(manifest, null, 2));
run('npm', ['install', '--no-audit', '--no-fund'], {cwd: app});
for (const name of Object.keys(internal)) assert.ok(realpathSync(join(app, 'node_modules', name)).startsWith(app + '/'), `${name} resolves outside consumer`);
run('npm', ['run', 'build'], {cwd: app});
run('npm', ['run', 'typecheck'], {cwd: app});
// Next regenerates its declaration; the only intentional source adaptations are
// the install manifest, the local tsconfig base path, and this generated file. All Portal implementation stays exact.
for (const file of fixture.files.filter(f => f.path.startsWith('apps/portal/') && !['apps/portal/package.json', 'apps/portal/next-env.d.ts', 'apps/portal/tsconfig.json'].includes(f.path))) {
  assert.equal(createHash('sha256').update(readFileSync(join(consumer, file.path))).digest('hex'), file.sha256, `Portal source drift: ${file.path}`);
}
const result = {status: 'passed', baseline: fixture.commit, consumer: app, internalPackages: Object.keys(internal), source: 'frozen compatibility fixture; no real services tested'};
writeFileSync('artifacts/portal-consumer.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
