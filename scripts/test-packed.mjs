import { checkConsumerHttp } from './consumer-http.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, realpathSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { run } from './workspace.mjs';
const root = resolve('.');
const temporary = realpathSync(mkdtempSync(join(tmpdir(), 'saas-packed-')));
const metadata = JSON.parse(readFileSync('artifacts/npm-pack.json'));
const lock = JSON.parse(readFileSync('package-lock.json'));
function json(path, value) { writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); }
function files(path) { return readdirSync(path, {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(join(path, e.name)) : [join(path, e.name)]); }
const dependencies = Object.fromEntries(metadata.map(p => [p.name, `file:${join(root, 'artifacts', p.filename)}`]));
json(join(temporary, 'package.json'), {private: true, type: 'module', dependencies: {'create-saas-app': dependencies['create-saas-app']}});
run('npm', ['install', '--no-audit', '--no-fund'], {cwd: temporary});
const generated = realpathSync(mkdtempSync(join(tmpdir(), 'saas-consumer-'))) + '/app';
// Execute the installed bin (a symlink), not the source entry point.
run(join(temporary, 'node_modules/.bin/create-saas-app'), ['--directory', generated, '--name', 'packed-demo', '--title', 'Packed Demo'], {cwd: temporary});
assert.ok(existsSync(join(generated, 'package.json')), 'installed scaffold bin must create the application');
const manifest = JSON.parse(readFileSync(join(generated, 'package.json')));
for (const group of ['dependencies', 'devDependencies']) {
  for (const name of Object.keys(manifest[group] ?? {})) {
    if (dependencies[name]) manifest[group][name] = dependencies[name];
    else if (lock.packages[`node_modules/${name}`]?.version) manifest[group][name] = lock.packages[`node_modules/${name}`].version;
  }
}
manifest.dependencies = {...manifest.dependencies, ...dependencies};
json(join(generated, 'package.json'), manifest);
run('npm', ['install', '--no-audit', '--no-fund'], {cwd: generated});
let typeImports = '', runtimeImports = '';
let count = 0;
for (const item of metadata) {
  const directory = join(generated, 'node_modules', item.name);
  assert.ok(realpathSync(directory).startsWith(generated + '/'), `package escapes consumer: ${item.name}`);
  for (const entry of item.files) assert.ok(!/(^|\/)(node_modules|\.next|__pycache__|\.env)(\/|$)|\.test\.|\.tsbuildinfo$/.test(entry.path), `unwanted packed file: ${entry.path}`);
  const p = JSON.parse(readFileSync(join(directory, 'package.json')));
  for (const [key, target] of Object.entries(p.exports ?? {})) {
    if (typeof target === 'string') { assert.ok(readFileSync(join(directory, target)).length); continue; }
    const matches = key.includes('*')
      ? files(join(directory, 'dist')).filter(f => f.endsWith('.js') && f.includes(target.import.split('*')[0].slice(1))).map(f => {
          const prefix = join(directory, target.import.split('*')[0]);
          return {specifier: p.name + key.slice(1).replace('*', relative(prefix, f).slice(0, -3)), target: f};
        })
      : [{specifier: p.name + (key === '.' ? '' : key.slice(1)), target: join(directory, target.import)}];
    assert.ok(matches.length, `empty export: ${p.name} ${key}`);
    for (const match of matches) {
      assert.ok(existsSync(match.target.replace(/\.js$/, '.d.ts')));
      typeImports += `import * as Export${count} from ${JSON.stringify(match.specifier)};\nexport type Type${count} = typeof Export${count};\n`;
      // Next Server Actions require a Next runtime; exercised by the consumer build below.
      if (!match.specifier.startsWith('@saas-platform/spike-app')) runtimeImports += `await import(${JSON.stringify(match.specifier)});\n`;
      count++;
    }
  }
  for (const bin of Object.values(p.bin ?? {})) assert.ok(readFileSync(join(directory, bin), 'utf8').startsWith('#!/usr/bin/env node'));
}
const tsconfig = JSON.parse(readFileSync(join(generated, 'tsconfig.json')));
tsconfig.compilerOptions.skipLibCheck = false;
tsconfig.compilerOptions.allowImportingTsExtensions = false;
json(join(generated, 'tsconfig.json'), tsconfig);
writeFileSync(join(generated, 'exports-check.ts'), typeImports);
writeFileSync(join(generated, 'runtime-check.mjs'), runtimeImports);
run('node', ['runtime-check.mjs'], {cwd: generated});
run('npm', ['run', 'build'], {cwd: generated, env: {...process.env, SAAS_RUNTIME_MODE: 'standalone', NEXT_TELEMETRY_DISABLED: '1'}});
// Include the Next-only spike entry and its Server Action in the real consumer graph.
mkdirSync(join(generated, 'app/probe'));
mkdirSync(join(generated, 'public'));
writeFileSync(join(generated, 'public/sdk-probe.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><title>sdk-static-probe</title><rect width="20" height="20" fill="green"/></svg>');
const saasManifest = JSON.parse(readFileSync(join(generated, 'saas.manifest.json')));
saasManifest.publicAssets.push('sdk-probe.svg');
json(join(generated, 'saas.manifest.json'), saasManifest);
writeFileSync(join(generated, 'app/probe/page.tsx'), 'import { SpikePage } from "@saas-platform/spike-app";\nimport { saasPublicAsset } from "@saas-platform/sdk";\nimport { parseSaasManifest } from "@saas-platform/manifest-schema";\nimport manifest from "../../saas.manifest.json";\nexport default function Page() { return <><img alt="SDK asset" src={saasPublicAsset(parseSaasManifest(manifest), "sdk-probe.svg")} /><SpikePage appName="Packed Demo" basePath="/packed-demo" topology="isolated packages" /></>; }\n');
run('npm', ['run', 'build'], {cwd: generated, env: {...process.env, SAAS_RUNTIME_MODE: 'standalone', NEXT_TELEMETRY_DISABLED: '1'}});
run('npm', ['run', 'typecheck'], {cwd: generated});
run(join(generated, 'node_modules/.bin/saas-contract'), ['check', generated, '--require-build'], {cwd: generated});
const styles = files(join(generated, '.next/static')).filter(p => p.endsWith('.css')).map(p => readFileSync(p, 'utf8')).join('\n');
assert.ok(styles.includes('--sidebar'), 'theme variables missing from consumer CSS');
assert.ok(styles.includes('.inline-flex'), 'UI utility styles missing from consumer CSS');
assert.ok(styles.includes('.gap-10'), 'spike-app utilities missing from consumer CSS');
assert.ok(styles.includes('Manrope'), 'packaged font styles missing');
assert.ok(readFileSync(join(generated, 'node_modules/@saas-platform/sdk/dist/react.js'), 'utf8').startsWith('"use client";'));
assert.ok(readFileSync(join(generated, 'node_modules/@saas-platform/spike-app/dist/actions.js'), 'utf8').startsWith('"use server";'));
const http = await checkConsumerHttp(generated);
json(join(root, 'artifacts/consumer-http.json'), http);
const result = {http, consumer: generated, exportsChecked: count, packages: metadata.map(p => p.name), status: 'passed'};
json(join(root, 'artifacts/packed-consumer.json'), result);
console.log(JSON.stringify(result, null, 2));
