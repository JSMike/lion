import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import url from 'node:url';
import util from 'node:util';

const execFile = util.promisify(childProcess.execFile);
const packageRoot = url.fileURLToPath(new URL('../', import.meta.url));
const repoRoot = path.resolve(packageRoot, '../..');
const version = '7.9.0-tlouisse.libphonenumber-9.0.41';

async function runNpm(args, cwd) {
  const npmCli = process.env.npm_execpath;
  assert(npmCli, 'Run these packaging tests through npm so npm_execpath is available.');
  const { stdout } = await execFile(process.execPath, [npmCli, ...args], {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

test(
  'npm pack installs the bundled phone package in an independent consumer',
  { timeout: 180000 },
  async () => {
    // Outside the checkout: ancestor node_modules, workspace links and overrides cannot help.
    const fixture = await fs.mkdtemp(path.resolve(repoRoot, '../lion-phone-packaging-'));
    try {
      const [packed] = JSON.parse(
        await runNpm(
          ['pack', '--workspace', '@lion/ui', '--json', '--pack-destination', fixture],
          repoRoot,
        ),
      );
      assert.deepEqual(packed.bundled, ['awesome-phonenumber']);
      const files = new Set(packed.files.map(file => file.path));
      const checksums = JSON.parse(
        await fs.readFile(path.join(packageRoot, 'vendor/checksums.json'), 'utf8'),
      );
      for (const file of Object.keys(checksums)) {
        assert(files.has(`node_modules/awesome-phonenumber/${file}`), `Missing bundled ${file}`);
        assert(files.has(`vendor/awesome-phonenumber/${file}`), `Missing vendored ${file}`);
      }
      assert(![...files].some(file => file.endsWith('.tgz')), 'Do not ship nested tarballs');

      await fs.writeFile(
        path.join(fixture, 'package.json'),
        JSON.stringify({ private: true, type: 'module' }),
      );
      await runNpm(
        ['install', '--no-audit', '--no-fund', path.join(fixture, packed.filename)],
        fixture,
      );
      const installedRoot = path.join(fixture, 'node_modules/@lion/ui');
      const manifest = JSON.parse(
        await fs.readFile(path.join(installedRoot, 'package.json'), 'utf8'),
      );
      assert.equal(manifest.dependencies['awesome-phonenumber'], version);
      assert.deepEqual(manifest.bundledDependencies, ['awesome-phonenumber']);
      const consumerManifest = JSON.parse(
        await fs.readFile(path.join(fixture, 'package.json'), 'utf8'),
      );
      assert.equal(consumerManifest.overrides, undefined);

      const bundledRoot = path.join(installedRoot, 'node_modules/awesome-phonenumber');
      assert.equal(await fs.realpath(bundledRoot), bundledRoot);
      for (const [file, expected] of Object.entries(checksums)) {
        for (const directory of [
          bundledRoot,
          path.join(installedRoot, 'vendor/awesome-phonenumber'),
        ]) {
          const sha256 = crypto
            .createHash('sha256')
            .update(await fs.readFile(path.join(directory, file)))
            .digest('hex');
          assert.equal(sha256, expected, `Installed checksum mismatch: ${directory}/${file}`);
        }
      }

      for (const file of ['phone-consumer.mjs', 'phone-consumer.mts', 'phone-consumer.cts']) {
        await fs.copyFile(
          path.join(packageRoot, 'test-node/fixtures', file),
          path.join(installedRoot, file),
        );
      }
      await execFile(process.execPath, [path.join(installedRoot, 'phone-consumer.mjs')], {
        cwd: fixture,
      });
      await fs.writeFile(
        path.join(fixture, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
            skipLibCheck: false,
            noEmit: true,
            types: [],
          },
          files: [
            'node_modules/@lion/ui/phone-consumer.mts',
            'node_modules/@lion/ui/phone-consumer.cts',
          ],
        }),
      );
      await execFile(
        process.execPath,
        [path.join(repoRoot, 'node_modules/typescript/bin/tsc'), '-p', fixture],
        { cwd: fixture },
      );
    } finally {
      await fs.rm(fixture, { recursive: true, force: true });
    }
  },
);

test('prepack rejects modified vendored bytes before preparing the bundle', async () => {
  const scratchRoot = path.join(repoRoot, '.tmp');
  await fs.mkdir(scratchRoot, { recursive: true });
  const fixture = await fs.mkdtemp(path.join(scratchRoot, 'phone-checksum-'));
  try {
    await fs.mkdir(path.join(fixture, 'scripts'));
    await fs.copyFile(
      path.join(packageRoot, 'scripts/prepare-vendored-phone.js'),
      path.join(fixture, 'scripts/prepare-vendored-phone.js'),
    );
    await fs.copyFile(path.join(packageRoot, 'package.json'), path.join(fixture, 'package.json'));
    await fs.cp(path.join(packageRoot, 'vendor'), path.join(fixture, 'vendor'), {
      recursive: true,
    });
    await fs.appendFile(
      path.join(fixture, 'vendor/awesome-phonenumber/index.js'),
      '\n// modified\n',
    );
    await assert.rejects(
      execFile(process.execPath, [path.join(fixture, 'scripts/prepare-vendored-phone.js')]),
      /Vendored checksum mismatch: index.js/,
    );
    await assert.rejects(fs.stat(path.join(fixture, 'node_modules')), { code: 'ENOENT' });
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
});

test('the root vendor dependency installs offline as a regular package without build dependencies', async () => {
  const scratchRoot = path.join(repoRoot, '.tmp');
  await fs.mkdir(scratchRoot, { recursive: true });
  const fixture = await fs.mkdtemp(path.join(scratchRoot, 'phone-root-install-'));
  try {
    const rootManifest = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
    const dependency = rootManifest.devDependencies['awesome-phonenumber'];
    assert.equal(dependency, 'file:packages/ui/vendor/awesome-phonenumber');
    await fs.copyFile(path.join(repoRoot, '.npmrc'), path.join(fixture, '.npmrc'));
    await fs.cp(
      path.join(packageRoot, 'vendor/awesome-phonenumber'),
      path.join(fixture, dependency.slice('file:'.length)),
      { recursive: true },
    );
    await fs.writeFile(
      path.join(fixture, 'package.json'),
      JSON.stringify({
        private: true,
        devDependencies: { 'awesome-phonenumber': dependency },
      }),
    );
    await runNpm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], fixture);
    const installed = path.join(fixture, 'node_modules/awesome-phonenumber');
    assert.equal(await fs.realpath(installed), installed);
    assert.equal(
      JSON.parse(await fs.readFile(path.join(installed, 'package.json'))).version,
      version,
    );
    assert.deepEqual((await fs.readdir(path.join(fixture, 'node_modules'))).sort(), [
      '.package-lock.json',
      'awesome-phonenumber',
    ]);
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
});
