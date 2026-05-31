const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const requiredFiles = ["manifest.json", "content.js", "content.css", "README.md"];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const manifestPath = path.join(root, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

if (manifest.manifest_version !== 3) {
  throw new Error("manifest.json must use Manifest V3");
}

if (!manifest.name || !manifest.version) {
  throw new Error("manifest.json must include name and version");
}

if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
  throw new Error("manifest.json must define at least one content script");
}

for (const scriptGroup of manifest.content_scripts) {
  for (const jsFile of scriptGroup.js || []) {
    const scriptPath = path.join(root, jsFile);
    vm.createScript(fs.readFileSync(scriptPath, "utf8"), { filename: jsFile });
  }

  for (const cssFile of scriptGroup.css || []) {
    const cssPath = path.join(root, cssFile);
    if (!fs.existsSync(cssPath)) {
      throw new Error(`Missing CSS file referenced by manifest: ${cssFile}`);
    }
  }
}

console.log("Extension validation passed.");
