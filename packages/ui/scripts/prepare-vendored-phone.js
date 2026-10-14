import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import url from 'url';
import assert from 'assert/strict';

const packageRoot = url.fileURLToPath(new URL('../', import.meta.url));
const vendorRoot = path.join(packageRoot, 'vendor/awesome-phonenumber');
const checksums = JSON.parse(
  await fs.promises.readFile(path.join(packageRoot, 'vendor/checksums.json'), 'utf8'),
);

async function verifyDirectory(directory, prefix = '') {
  const files = [];
  for (const entry of await fs.promises.readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await verifyDirectory(absolute, `${relative}/`)));
    } else {
      assert(entry.isFile(), `Unexpected vendored entry: ${relative}`);
      const sha256 = crypto
        .createHash('sha256')
        .update(await fs.promises.readFile(absolute))
        .digest('hex');
      assert.equal(sha256, checksums[relative], `Vendored checksum mismatch: ${relative}`);
      files.push(relative);
    }
  }
  return files;
}

assert.deepEqual((await verifyDirectory(vendorRoot)).sort(), Object.keys(checksums).sort());
const manifest = JSON.parse(
  await fs.promises.readFile(path.join(vendorRoot, 'package.json'), 'utf8'),
);
const lionManifest = JSON.parse(
  await fs.promises.readFile(path.join(packageRoot, 'package.json'), 'utf8'),
);
assert.equal(manifest.name, 'awesome-phonenumber');
assert.equal(manifest.version, '7.9.0-tlouisse.libphonenumber-9.0.41');
assert.equal(lionManifest.dependencies[manifest.name], manifest.version);
assert.deepEqual(lionManifest.bundledDependencies, [manifest.name]);
assert.equal(Object.keys(manifest.dependencies || {}).length, 0);

// npm only bundles dependencies physically inside the workspace, not hoisted packages.
const bundledPackage = path.join(packageRoot, 'node_modules/awesome-phonenumber');
await fs.promises.rm(bundledPackage, { recursive: true, force: true });
await fs.promises.cp(vendorRoot, bundledPackage, { recursive: true });
