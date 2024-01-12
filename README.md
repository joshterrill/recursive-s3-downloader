=# Recursive S3 Downloader

A slow but effective script that takes an open s3 root URL as an argument, loops through all available directories and files, exports them, and then downloads the files

### CLI usage

```sh
npm i -g recursive-s3-downloader
recursive-s3-downloader <root s3 bucket url here>
# optional param: --saveDirAndFileList
```

### Code usage

```sh
npm i recursive-s3-downloader --save
```

```javascript
const recusriveS3Downloader = require('recursive-s3-downloader');

await recusriveS3Downloader.download('<root s3 bucket url here>', {saveDirAndFileList: true})
```

### License

MIT
