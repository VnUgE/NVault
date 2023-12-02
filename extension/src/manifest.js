// Copyright (C) 2023 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.


import pkg from "../package.json";

const sharedManifest = {
  content_scripts: [
    {
      js: ["src/entries/contentScript/primary/main.js"],
      matches: ["*://*/*"]
    },
  ],
  icons: {
    16: "icons/16.png",
    32: "icons/32.png",
    38: "icons/38.png",
    48: "icons/48.png",
    72: "icons/72.png",
    96: "icons/96.png",
  },
  options_ui: {
    page: "src/entries/options/index.html",
    open_in_tab: true,
    browser_style:false
  },
  permissions: [
    'storage',
    'activeTab',
  ],

  browser_specific_settings: {
    "gecko": {
      "id": "{d71bf2c0-7485-4572-b1a5-c5dd2c5f16d5}"
    }
  },

  "content_security_policy": "script-src 'self'; object-src 'self';"
};

const browserAction = {
  default_icon: {
    16: "icons/16.png",
    32: "icons/32.png",
    38: "icons/38.png",
  },
  default_popup: "src/entries/popup/index.html",
};

const ManifestV2 = {
  ...sharedManifest,
  background: {
    scripts: ["src/entries/background/script.js"],
    persistent: true,
  },
  browser_action: browserAction,
  options_ui: {
    ...sharedManifest.options_ui,
    chrome_style: false,
  },
  permissions: [...sharedManifest.permissions, "*://*/*"],
};

const ManifestV3 = {
  ...sharedManifest,
  action: browserAction,
  background: {
    service_worker: "src/entries/background/serviceWorker.js",
  },
  host_permissions: ["*://*/*"],
};

export function getManifest(manifestVersion) {
  const manifest = {
    author: pkg.author,
    description: pkg.description,
    name: pkg.displayName ?? pkg.name,
    version: pkg.version,
  };

  if (manifestVersion === 2) {
    return {
      ...manifest,
      ...ManifestV2,
      manifest_version: manifestVersion,
    };
  }

  if (manifestVersion === 3) {
    return {
      ...manifest,
      ...ManifestV3,
      manifest_version: manifestVersion,
    };
  }

  throw new Error(
    `Missing manifest definition for manifestVersion ${manifestVersion}`
  );
}
