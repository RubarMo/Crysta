const fs = require('fs');
const path = require('path');

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY; // "owner/repo"
const tag = process.env.GITHUB_REF_NAME; // "v2.5.0"

if (!token || !repo || !tag) {
  console.error("Missing required environment variables (GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_REF_NAME)");
  process.exit(1);
}

const version = tag.replace(/^v/, '');

async function run() {
  try {
    // 1. Fetch release details by tag
    console.log(`Fetching release assets for tag ${tag} in ${repo}...`);
    const releaseRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Tauri-Updater-Updater'
      }
    });

    if (!releaseRes.ok) {
      throw new Error(`Failed to fetch release: ${releaseRes.statusText} (${releaseRes.status})`);
    }

    const release = await releaseRes.json();
    console.log(`Found release: ${release.name} (Draft: ${release.draft})`);

    const assets = release.assets;
    console.log(`Found ${assets.length} assets.`);

    // Helper to download signature content
    const downloadSignature = async (assetId) => {
      const res = await fetch(`https://api.github.com/repos/${repo}/releases/assets/${assetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/octet-stream',
          'User-Agent': 'Tauri-Updater-Updater'
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to download signature asset ${assetId}: ${res.statusText}`);
      }
      const text = await res.text();
      return text.trim();
    };

    // Initialize mapping
    const platformData = {
      'windows-x86_64': { url: '', sigAssetId: null },
      'darwin-x86_64': { url: '', sigAssetId: null },
      'darwin-aarch64': { url: '', sigAssetId: null },
      'linux-x86_64': { url: '', sigAssetId: null }
    };

    // Group assets
    for (const asset of assets) {
      const name = asset.name;
      const url = asset.browser_download_url;

      if (name.endsWith('.msi')) {
        platformData['windows-x86_64'].url = url;
      } else if (name.endsWith('.msi.sig')) {
        platformData['windows-x86_64'].sigAssetId = asset.id;
      } else if (name.endsWith('.deb')) {
        platformData['linux-x86_64'].url = url;
      } else if (name.endsWith('.deb.sig')) {
        platformData['linux-x86_64'].sigAssetId = asset.id;
      } else if (name.endsWith('.app.tar.gz') && !name.endsWith('.sig')) {
        platformData['darwin-x86_64'].url = url;
        platformData['darwin-aarch64'].url = url;
      } else if (name.endsWith('.app.tar.gz.sig')) {
        platformData['darwin-x86_64'].sigAssetId = asset.id;
        platformData['darwin-aarch64'].sigAssetId = asset.id;
      }
    }

    // Load updater.json
    const updaterPath = path.join(__dirname, '..', 'updater.json');
    const updater = JSON.parse(fs.readFileSync(updaterPath, 'utf8'));

    // Update basic info
    updater.version = version;
    updater.notes = `Release version ${version}.`;

    // Fetch and assign signatures
    for (const [platform, data] of Object.entries(platformData)) {
      if (data.url) {
        updater.platforms[platform].url = data.url;
      }
      if (data.sigAssetId) {
        console.log(`Downloading signature for ${platform}...`);
        const signature = await downloadSignature(data.sigAssetId);
        updater.platforms[platform].signature = signature;
      }
    }

    // Save updated updater.json
    fs.writeFileSync(updaterPath, JSON.stringify(updater, null, 2) + '\n', 'utf8');
    console.log(`Successfully updated updater.json for version ${version}!`);

  } catch (error) {
    console.error("Error updating updater.json:", error);
    process.exit(1);
  }
}

run();
