import { expect } from 'chai';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

describe('Custom Elements Manifest', () => {
  it('describes runtime elements without registering test fixtures', () => {
    execFileSync(process.execPath, ['scripts/cem.js'], {
      cwd: new URL('../', import.meta.url),
      stdio: 'pipe',
    });
    const manifest = JSON.parse(readFileSync(new URL('../custom-elements.json', import.meta.url)));

    const paths = manifest.modules.map(module => module.path);
    expect(paths.some(path => /test-(helpers|suites)/.test(path))).to.equal(false);
    expect(paths.some(path => path.includes('@open-wc/testing'))).to.equal(false);

    const definitions = manifest.modules.flatMap(module =>
      (module.exports || []).filter(entry => entry.kind === 'custom-element-definition'),
    );
    expect(definitions.some(entry => entry.name === 'lion-button')).to.equal(true);
    expect(new Set(definitions.map(entry => entry.name)).size).to.equal(definitions.length);
    for (const entry of definitions) {
      expect(entry.name).to.match(/^[a-z][a-z0-9._-]*-[a-z0-9._-]*$/);
    }

    // Dependency analysis must still provide inherited component API metadata.
    const input = manifest.modules
      .flatMap(module => module.declarations || [])
      .find(declaration => declaration.name === 'LionInput');
    expect(
      input.members.some(
        member => member.name === 'clear' && member.inheritedFrom?.name === 'LionField',
      ),
    ).to.equal(true);
  });
});
