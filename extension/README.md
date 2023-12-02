# @vnuge/nvault-extension

This directory contains the source code for the NVault browser extension. Base template forked from [@samrum/vite-plugin-web-extension](https://github.com/samrum/vite-plugin-web-extension)

## Usage Notes
The .env file contains build configuration variables. API variables are used as defaults on extension startup. Most settings such as server base url and endpoint urls are configurable from the extension options page.

### Install dependencies

```bash
npm install
```

### Build the extension
    
```bash
npm run build
```

Built extension output will be in the `dist` directory. You can zip the contents of this directory and load it into your browser.