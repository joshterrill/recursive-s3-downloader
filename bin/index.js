#!/usr/bin/env node

const { download } = require('../');
const args = process.argv.slice(2);
if (!args || args.length === 0) {
    console.log('Usage: recursive-s3-downloader <s3-bucket-url>');
    process.exit(0);
}

const url = args[0];
console.log(`Executing on: ${url}`);
download(url).then(() => {
    console.log('Done!');
    process.exit(0);
}).catch(err => console.error(err));