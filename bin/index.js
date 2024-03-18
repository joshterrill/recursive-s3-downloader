#!/usr/bin/env node

const { download } = require('../');
const args = process.argv.slice(2);

if (!args || args.length === 0) {
    console.log('Usage: recursive-s3-downloader <s3-bucket-url> [--skip-download] [--additional-prefixes"prefix1,prefix2,..."]');
    process.exit(0);
}
const url = args[0];
const skipDownload = args.includes('--skip-download');
const downloadOnly = args.includes('--download-only');
const additionalPrefixesArgIndex = args.findIndex(arg => arg === '--additional-prefixes');
let additionalPrefixes = [];

if (additionalPrefixesArgIndex !== -1 && args.length > additionalPrefixesArgIndex + 1) {
    additionalPrefixes = args[additionalPrefixesArgIndex + 1].split(',');
}

console.log(`Executing on: ${url}`);
download(url, skipDownload, additionalPrefixes, downloadOnly).then(() => {
    console.log('Done!');
    process.exit(0);
}).catch(err => console.error(err));
