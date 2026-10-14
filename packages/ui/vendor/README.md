# Vendored awesome-phonenumber

This temporary artifact replaces the registry dependency until the next upstream
awesome-phonenumber release incorporating the required metadata is available.

- Package: `awesome-phonenumber@7.9.0-tlouisse.libphonenumber-9.0.41`.
- Google libphonenumber: `v9.0.41`.
- Source: [tlouisse/awesome-phonenumber](https://github.com/tlouisse/awesome-phonenumber),
  commit `b4b6439136053624351f1c0fd8eb200ee867f37f`
  on branch `hu84jr-ing-phone-package-workflow`, based on upstream `9ff7ec8`.
- Original artifact: `awesome-phonenumber-7.9.0-tlouisse.libphonenumber-9.0.41.tgz`.
- Original artifact SHA-256: `855b0476ea7784457e8ec63d4824ff925eed0e339f72e8e05b7eea75a80ec018`.
- Original artifact npm integrity:
  `sha512-v1ZQJG8WeBfH2PFjiZidVnBwXrD/IxNbUbeNVAXltkGdOtZiNN5n/Bllfp601GhkUPByZPvrPjHEj+gT9LnZIQ==`.
- [Verified packaging workflow](https://github.com/tlouisse/awesome-phonenumber/actions/runs/38529804810):
  Node 22/npm 10 and local Node 24/npm 11 produced byte-identical artifacts.
- Distribution: the nine original files are unpacked in `awesome-phonenumber/`,
  byte-for-byte unchanged, including its custom version and upstream manifest.
  `checksums.json` records each file's SHA-256, verified against the original
  archive when unpacked. Prepack verifies this complete inventory before copying.
  There is no nested `.tgz` in the repository or published package.

## Reproduce

In a separate checkout of the source repository:

```sh
git checkout b4b6439136053624351f1c0fd8eb200ee867f37f
yarn install --immutable
PACK_DESTINATION=/absolute/path/to/artifacts npm run pack
npm run pack:verify -- /absolute/path/to/artifacts/awesome-phonenumber-7.9.0-tlouisse.libphonenumber-9.0.41.tgz
shasum -a 256 /absolute/path/to/artifacts/awesome-phonenumber-7.9.0-tlouisse.libphonenumber-9.0.41.tgz
```

After verifying the original archive hash above, extract it with
`tar -xzf <artifact> --strip-components=1 -C <empty-destination>`.
Compare the nine extracted files against `checksums.json` before replacing the
vendor directory; do not regenerate checksums merely to silence a mismatch.

The source workflow rebuilds Google's metadata and verifies the installed tarball's
CommonJS, ESM, and TypeScript entrypoints. The artifact has no runtime dependencies.
It contains the upstream README and `LICENSE`, `LICENSE.libphonenumber`, and
`LICENSE.closure-library`; these notices also accompany the bundled installed
package in published Lion packages.

## Packaging and removal

Lion's runtime dependency is the exact custom version
`7.9.0-tlouisse.libphonenumber-9.0.41`, accompanied by a real
`bundledDependencies: ["awesome-phonenumber"]` array. A numeric-keyed object is
not equivalent: npm silently omits the bundle. Do not restore a package-relative
`file:` runtime dependency; npm can try to resolve it in the consumer before
the package is unpacked, causing `ENOENT`.
The private root declares `file:packages/ui/vendor/awesome-phonenumber` as a
development dependency so npm installs it during `npm ci`. Root `.npmrc` sets
`install-links=true` to pack local directory dependencies instead of linking the
upstream development workspace (and installing its build dependencies).
The old docs package retains its registry version.
The temporary `prepack` helper verifies the complete file inventory and checksums,
package identity, exact dependency version, and bundle array. It then copies the
verified files into `packages/ui/node_modules/awesome-phonenumber`, since npm does
not bundle dependencies hoisted outside the workspace. It needs no npm subprocess,
temporary installation, network access, dependency scripts, or lockfile writes.
Run `npm ci`, `npm run prepublishOnly --workspace @lion/ui`, and
`npm pack --workspace @lion/ui --pack-destination /absolute/path/to/artifacts`.
Run `npm run test:node --workspace @lion/ui` for the automated packaging regression:
it packs Lion and installs the resulting tarball in a fresh consumer outside the
checkout, with no overrides or workspace links. It verifies both copies of every
vendored file (including all three licenses and metadata), CommonJS and ESM
entrypoints, strict NodeNext TypeScript imports from both module formats, Lion's
lazy phone loader, and the French Guiana premium-rate example `+594890123456`.
The consumer install uses the registry for Lion's other dependencies, never for
the custom bundled phone version. A separate test rejects tampered vendor bytes.

When the next upstream awesome-phonenumber release incorporates this metadata,
restore the registry dependency, remove bundling and this vendor directory, update
the lockfile, remove the root development dependency and `install-links=true`
setting if unused elsewhere, and retain the metadata regression test. Adapt the
packed-consumer test for the registry dependency. Remove the temporary `prepack` lifecycle and
`scripts/prepare-vendored-phone.js` helper too. See the root README for
the complete removal checklist.
