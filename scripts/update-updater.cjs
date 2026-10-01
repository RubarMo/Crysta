// Rebuilds updater.json from the assets of a published GitHub release.
// Runs from .github/workflows/update-updater.yml when a release is published,
// so the download URLs it writes are live.
const fs = require('fs');
const path = require('path');

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"
const tag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME; // "v2.5.0"

if (!token || !repo || !tag) {
  console.error("Missing required environment variables (GITHUB_TOKEN, GITHUB_REPOSITORY, RELEASE_TAG)");
  process.exit(1);
}

const version = tag.replace(/^v/, '');
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'Crysta-Updater-Sync',
};

// The updater looks for "{os}-{arch}-{installer}" first and falls back to
// "{os}-{arch}", so each installer type gets its own entry and the fallback
// keeps pointing at the package older builds were installed from.
const ASSET_RULES = [
  { suffix: '.msi', keys: ['windows-x86_64-msi', 'windows-x86_64'] },
  { suffix: '-setup.exe', keys: ['windows-x86_64-nsis'] },
  { suffix: '.deb', keys: ['linux-x86_64-deb', 'linux-x86_64'] },
  { suffix: '.rpm', keys: ['linux-x86_64-rpm'] },
  { suffix: '.AppImage', keys: ['linux-x86_64-appimage'] },
  {
    suffix: '.app.tar.gz',
    keys: ['darwin-x86_64-app', 'darwin-aarch64-app', 'darwin-x86_64', 'darwin-aarch64'],
  },
];

async function github(url, accept) {
  const res = await fetch(url, { headers: accept ? { ...headers, Accept: accept } : headers });
  if (!res.ok) {
    throw new Error(`GitHub request failed: ${url} → ${res.status} ${res.statusText}`);
  }
  return res;
}

async function run() {
  console.log(`Fetching release ${tag} of ${repo}...`);
  const release = await (await github(`https://api.github.com/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`)).json();

  if (release.draft) {
    throw new Error(`Release ${tag} is still a draft; updater.json must only point at published assets.`);
  }

  const assetsByName = new Map(release.assets.map((asset) => [asset.name, asset]));
  const platforms = {};

  for (const asset of release.assets) {
    const rule = ASSET_RULES.find((r) => asset.name.endsWith(r.suffix));
    if (!rule) continue;

    const sigAsset = assetsByName.get(`${asset.name}.sig`);
    if (!sigAsset) {
      console.warn(`No signature for ${asset.name}; skipping.`);
      continue;
    }

    const signature = (await (await github(sigAsset.url, 'application/octet-stream')).text()).trim();
    const url = `https://github.com/${repo}/releases/download/${tag}/${asset.name}`;
    for (const key of rule.keys) {
      platforms[key] = { signature, url };
    }
    console.log(`  ${asset.name} → ${rule.keys.join(', ')}`);
  }

  if (Object.keys(platforms).length === 0) {
    throw new Error('No signed updater assets found in the release.');
  }

  const updaterPath = path.join(__dirname, '..', 'updater.json');
  const previous = JSON.parse(fs.readFileSync(updaterPath, 'utf8'));
  const updater = {
    version,
    notes: (release.body || '').trim() || `Release version ${version}.`,
    pub_date: release.published_at || new Date().toISOString(),
    // Kept for reference; the app verifies with the pubkey in tauri.conf.json.
    ...(previous.pubkey ? { pubkey: previous.pubkey } : {}),
    platforms,
  };

  fs.writeFileSync(updaterPath, JSON.stringify(updater, null, 2) + '\n', 'utf8');
  console.log(`updater.json updated for version ${version}.`);
}

run().catch((error) => {
  console.error('Error updating updater.json:', error);
  process.exit(1);
});
