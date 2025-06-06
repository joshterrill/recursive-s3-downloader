const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const url = require('url');

async function download(inputUrl, skipDownload = false, additionalPrefixes = [], downloadOnly = false) {
    const parsedUrl = new URL(inputUrl);
    const rootUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const bucketName = parsedUrl.pathname.substring(1); // Remove the leading slash
    const prefix = parsedUrl.searchParams.get('prefix') || ''; // Extract prefix if exists
    const masterFileListName = bucketName ? `${bucketName}-masterFileList.json` : `${rootUrl.replace(/[^a-zA-Z0-9]/g, '')}-masterFileList.json`;
    if (downloadOnly && fs.existsSync(`./${masterFileListName}`)) {
        console.log('========= Download Only Invoked, Downloading Files =========');
        const masterFileList = JSON.parse(fs.readFileSync(`./${masterFileListName}`));
        await downloadFileList(rootUrl, masterFileList);
        return;
    }
    const dirs = await getDirList(rootUrl, bucketName, prefix);
    const files = await getMasterFileList(rootUrl, bucketName, dirs);
    if (!skipDownload) {
        await downloadFileList(rootUrl, files);
    }

    // Process additional prefixes
    for (const additionalPrefix of additionalPrefixes) {
        console.log(`Processing additional prefix: ${additionalPrefix}`);
        const additionalDirs = await getDirList(rootUrl, bucketName, additionalPrefix);
        const additionalFiles = await getMasterFileList(rootUrl, bucketName, additionalDirs);
        if (!skipDownload) {
            await downloadFileList(rootUrl, additionalFiles);
        }
    }
}


async function downloadFileList(rootUrl, masterFileList) {
    console.log('========= Downloading files =========');
    for (const key of masterFileList) {
        try {
            const newurl = `${rootUrl}/${key}`;
            printProgress(`Downloading: ${newurl}`);
            const data  = await axios.get(newurl);
            const dir = key.substring(0, key.lastIndexOf('/'));
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir, {recursive: true});
            }
            fs.writeFileSync(`./${key}`, data.data);
        } catch (error) {
            // do nothing
        }
    }
}

async function getMasterFileList(rootUrl, bucketName, masterDirList) {
    console.log('========= Looping over files =========');
    const masterFileList = [];
    for (const dir of masterDirList) {
        try {
            const fileUrl = `${rootUrl}${bucketName === '' ? '' : `${bucketName}/`}/?prefix=${dir}`;
            const files = await getFileListForDir(fileUrl);
            for (const f of files) {
                if (!masterFileList.includes(f)) {
                    masterFileList.push(f);
                }
            }
        } catch (error) {
            // do nothing
        }
    }
    const fileName = bucketName ? `${bucketName}-masterFileList.json` : `${rootUrl.replace(/[^a-zA-Z0-9]/g, '')}-masterFileList.json`;
    if (fs.existsSync(`./${fileName}`)) {
        console.log('File already exists in getMasterFileList, going to start appending');
        const oldMasterFileList = JSON.parse(fs.readFileSync(`./${fileName}`));
        for (const file of oldMasterFileList) {
            if (!masterFileList.includes(file)) {
                masterFileList.push(file);
            }
        }
    }
    fs.writeFileSync(`./${fileName}`, JSON.stringify(masterFileList));
    return masterFileList;
}

async function getDirList(rootUrl, bucketName, prefix) {
    console.log('========= Looping over dirs =========');
    const startUrl = `${rootUrl}${bucketName === '' ? '' : `${bucketName}/`}/?prefix=${prefix}`;
    const masterDirList = await getDirsRecursive(startUrl);
    for (const dir of masterDirList) {
        try {
            const newurl = `${rootUrl}${bucketName === '' ? '' : `${bucketName}/`}/?prefix=${dir}`;
            const newDirs = await getDirsRecursive(newurl);
            for (const d of newDirs) {
                if (!masterDirList.includes(d)) {
                    masterDirList.push(d);
                }
            }
        } catch (error) {
            // Handle error
        }
    }
    
    const fileName = bucketName ? `${bucketName}-masterDirList.json` : `${rootUrl.replace(/[^a-zA-Z0-9]/g, '')}-masterDirList.json`;
    if (fs.existsSync(`./${fileName}`)) {
        console.log('File already exists in getDirList, going to start appending');
        const oldMasterDirList = JSON.parse(fs.readFileSync(`./${fileName}`));
        for (const dir of oldMasterDirList) {
            if (!masterDirList.includes(dir)) {
                masterDirList.push(dir);
            }
        }
    }
    fs.writeFileSync(`./${fileName}`, JSON.stringify(masterDirList));
    return masterDirList;
}

async function getFileListForDir(url) {
    return new Promise(async (resolve, reject) => {
        const files = [];
        const response = await axios.get(url);
        if (response.status === 200) {
            const json = await xml2jsPromise(response.data);
            const contents = json.ListBucketResult.Contents;
            contents.shift();
            for (const c of contents) {
                const key = c.Key[0];
                if (!files.includes(key)) {
                    files.push(key);
                }
            }
        } else {
            reject('Error: response status not 200');
        }
        resolve(files);
    });
}

async function getDirsRecursive(url) {
    return new Promise(async (resolve, reject) => {
        const dirs = [];
        const response = await axios.get(url);
        if (response.status === 200) {
            const json = await xml2jsPromise(response.data);
            const contents = json.ListBucketResult.Contents;
            contents.shift();
            for (const c of contents) {
                try {
                    const key = c.Key[0];
                    const dir = key.substring(0, key.lastIndexOf('/'));
                    if (!dirs.includes(dir)) {
                        dirs.push(dir);
                    }
                } catch (error) {
                    // do nothing
                }
                
            }
            resolve(dirs);
        } else {
            reject('Error: response status not 200');
        }
    });
}

async function xml2jsPromise(xml) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, (err, json) => {
            if (err) {
                reject(null);
            }
            resolve(json);
        });
    });
}

function printProgress(line){
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(line);
}

module.exports = {
    download,
}