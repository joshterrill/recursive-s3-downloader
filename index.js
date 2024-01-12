const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');

async function download(rootUrl) {
    if (rootUrl[rootUrl.length - 1] === '/') {
        rootUrl = rootUrl.substring(0, rootUrl.length - 1);
    }
    const bucketName = rootUrl.substring(rootUrl.lastIndexOf('/') + 1);
    const dirs = await getDirList(rootUrl, bucketName);
    const files = await getMasterFileList(rootUrl, bucketName, dirs);
    
    await downloadFileList(rootUrl, files);
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
            const fileUrl = `${rootUrl}/?prefix=${dir}`;
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
    fs.writeFileSync(`./${bucketName}-masterFileList.json`, JSON.stringify(masterFileList));
    return masterFileList;
}

async function getDirList(rootUrl, bucketName) {
    console.log('========= Looping over dirs =========');
    const masterDirList = await getDirsRecursive(rootUrl);
    for (const dir of masterDirList) {
        try {
            const newurl = `${rootUrl}/?prefix=${dir}`;
            const newDirs = await getDirsRecursive(newurl);
            for (const d of newDirs) {
                if (!masterDirList.includes(d)) {
                    masterDirList.push(d);
                }
            }
        } catch (error) {
            // do nothing
        }
        
    }
    fs.writeFileSync(`./${bucketName}-masterDirList.json`, JSON.stringify(masterDirList));
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
            reject(null);
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