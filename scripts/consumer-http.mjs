import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export async function checkConsumerHttp(app) {
  const requests = [];
  const auth = createServer((request, response) => {
    requests.push({path: request.url, authorization: request.headers.authorization});
    if (request.url !== '/v1/authorization/current_user' || request.headers.authorization !== 'Bearer sdk-test-token') {
      response.writeHead(401).end(); return;
    }
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({id: 'sdk-test', name: 'SDK Test User', email: 'sdk-test@example.invalid'}));
  });
  auth.listen(0, '127.0.0.1');
  await once(auth, 'listening');
  let child;
  let output = '';
  try {
    // Next accepts port zero; read the actual bound port from its ready output.
    child = spawn(process.execPath, [join(app, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '0'], {
      cwd: app, env: {...process.env, SAAS_RUNTIME_MODE: 'standalone', SAAS_AUTH_SERVICE_URL: `http://127.0.0.1:${auth.address().port}`, SAAS_DSP_TOKEN_COOKIE: 'dsp-token', NEXT_TELEMETRY_DISABLED: '1'}, stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    let spawnError;
    child.on('error', error => { spawnError = error; });
    const deadline = Date.now() + 30000;
    let origin;
    while (Date.now() < deadline) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null) throw new Error(`Next exited early: ${output}`);
      origin = output.match(/http:\/\/127\.0\.0\.1:(\d+)/)?.[0];
      if (origin && /Ready in/.test(output)) break;
      await delay(100);
    }
    assert.ok(origin && /Ready in/.test(output), `Next did not become ready: ${output}`);
    async function get(path, expected, options = {}) {
      const response = await fetch(origin + path, {redirect: 'manual', signal: AbortSignal.timeout(10000), ...options});
      assert.equal(response.status, expected, `${path}: ${response.status}`);
      return response;
    }
    const health = await get('/packed-demo/api/saas/health', 200);
    assert.equal((await health.json()).appName, 'packed-demo');
    const asset = await get('/packed-demo/sdk-probe.svg', 200);
    assert.match(asset.headers.get('content-type'), /image\/svg\+xml/);
    assert.match(await asset.text(), /sdk-static-probe/);
    const headers = {cookie: 'dsp-token=sdk-test-token'};
    const page = await get('/packed-demo', 200, {headers});
    const html = await page.text();
    assert.match(html, /Packed Demo/);
    assert.match(html, /SDK Test User/);
    const probe = await get('/packed-demo/probe?source=sdk-http', 200, {headers});
    const probeHtml = await probe.text();
    assert.match(probeHtml, /\/packed-demo\/sdk-probe\.svg/);
    const resources = [...new Set([...html.matchAll(/(?:src|href)="([^" ]+)"/g)].map(m => m[1]).filter(p => p.includes('/_next/static/')))];
    assert.ok(resources.some(p => p.endsWith('.css')), 'No stylesheet URLs in rendered HTML');
    assert.ok(resources.some(p => p.endsWith('.js')), 'No script URLs in rendered HTML');
    for (const resource of resources) {
      assert.ok(resource.startsWith('/packed-demo/_next/static/'), `Asset escaped basePath: ${resource}`);
      const response = await get(resource, 200);
      const type = response.headers.get('content-type') ?? '';
      assert.match(type, resource.endsWith('.css') ? /text\/css/ : /javascript|font|octet-stream/);
    }
    await get('/sdk-probe.svg', 404, {headers});
    await get('/api/saas/health', 404, {headers});
    await get('/packed-demo/missing-probe.svg', 404, {headers});
    assert.ok(requests.length > 0 && requests.every(r => r.path === '/v1/authorization/current_user' && r.authorization === 'Bearer sdk-test-token'));
    return {status: 'passed', origin, resourcesChecked: resources.length, publicAsset: '/packed-demo/sdk-probe.svg', auth: 'local mock, standalone current-user only'};
  } finally {
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([once(child, 'exit'), delay(5000)]);
      if (child.exitCode === null) child.kill('SIGKILL');
    }
    auth.closeAllConnections();
    await new Promise(resolve => auth.close(resolve));
    writeFileSync('artifacts/consumer-http-server.log', output);
  }
}
