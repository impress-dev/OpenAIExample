const FormData = require('form-data');
const fetch = require('node-fetch');
const { toSystemPath } = require('../../../lib/core/path');
const fs = require('fs')

exports.APIFileUploadAction = async function (options) {
    options = this.parse(options)
    if (!options.APIURL || !options.APIURL.includes('http')) {
        throw 'Invalid API URL';
    }

    let headersObj = {};

    // Content Type
    if (options.dataType)
        headersObj['Content-Type'] = options.dataType;

    // Authorization
    if (options.authorization == 'basic') {
        if (!options.userName || !options.userPass) {
            throw 'Username and password are required for basic authorization';
        }

        let buff = new Buffer.from(options.userName + ':' + options.userPass);
        let base64Key = buff.toString('base64');
        headersObj['Authorization'] = `Basic ${base64Key}`;
    }

    // Headers
    if (options.headers) {
        headersObj = { ...headersObj, ...options.headers };
    }

    let bodyData;
    let formData = new FormData();

    // File Only
    if (options.uploadMethod == 'fileOnly') {
        if (!options.path) {
            throw 'File path is required';
        }

        if (options.path.includes('http')) {
            bodyData = await fetch(options.path).then(response => response.blob());
        }
        else {
            let pathFile = toSystemPath(this.parseRequired(options.path, 'string', 'fs.exists: path is required.'));
            bodyData = fs.readFileSync(pathFile);
        }
    }
    else {
        // Files and Data
        if (options.multipleFile == 'no') {
            // Single/Individual Files
            if (!options.filesIndividual) {
                throw 'File list is required';
            }

            let objectArray = Object.entries(options.filesIndividual);
            for (let arrNameUrl of objectArray) {
                let [name, path] = arrNameUrl;
                if (path.length == 0 || name.length == 0) {
                    throw 'Invalid file list';
                }

                if (path.includes('http')) {
                    let imgData = await fetch(path).then(response => response.buffer());
                    formData.append(name, imgData, {
                        filepath: path
                    });
                }
                else {
                    let pathFile = toSystemPath(this.parseRequired(path, 'string', 'fs.exists: path is required.'));
                    formData.append(name, fs.readFileSync(pathFile), {
                        filepath: pathFile
                    })
                }
            }
            bodyData = formData;
        }
        else {
            //Multiple files
            if (!options.fileNameForMultiple || options.fileNameForMultiple.length == 0)
                throw 'Invalid file name';

            if (options.filesMultipleSource && options.filesMultipleSource == 'array') {
                //Source: Array
                if (!options.filesMultipleArr || options.filesMultipleArr.length == 0)
                    throw 'No files in array';

                let filesArrName = options.fileNameForMultiple + '[]';
                let pathFound = 0;

                for (let fileObj of options.filesMultipleArr) {
                    let path = fileObj;

                    if (options.filesMultipleArrPath.length != 0)
                        path = fileObj[options.filesMultipleArrPath];

                    if (path.length == 0) {
                        continue;
                    }

                    pathFound = 1;

                    if (path.includes('http')) {
                        let imgData = await fetch(path).then(response => response.buffer());
                        formData.append(filesArrName, imgData, {
                            filepath: pathFile
                        });
                    }
                    else {
                        let pathFile = toSystemPath(this.parseRequired(path, 'string', 'fs.exists: path is required.'))
                        formData.append(filesArrName, fs.readFileSync(pathFile), {
                            filepath: pathFile
                        });
                    }
                }

                if (pathFound == 0) {
                    throw 'Could not find files in array';
                }

                bodyData = formData;
            }
            else {
                //Source: Grid
                if (!options.filesMultipleGrid) {
                    throw 'Files list is required';
                }

                let filesArrName = options.fileNameForMultiple + '[]'

                for (let pathObj of options.filesMultipleGrid) {
                    if (pathObj.value.includes('http')) {
                        let imgData = await fetch(pathObj.value).then(response => response.buffer());
                        formData.append(filesArrName, imgData);
                    }
                    else {
                        let pathFile = toSystemPath(this.parseRequired(pathObj.value, 'string', 'fs.exists: path is required.'));
                        formData.append(filesArrName, fs.readFileSync(pathFile), {
                            filepath: pathFile
                        });
                    }
                }

                bodyData = formData;
            }
        }

        // Input data - POST body
        if (options.inputData) {
            Object.entries(options.inputData).forEach(([key, value]) => {
                if (key.length == 0) {
                    throw 'Invalid input data';
                }
                formData.append(key, value);
            });
        }
    }

    // Qurery data - GET params
    if (options.queryData) {
        let str = '?';
        Object.keys(options.queryData).forEach(key => {
            str += `${key}=${options.queryData[key]}&`
        });
        options.APIURL += str.slice(0, -1);
    }

    // Call API
    let response = null, responseError = null;

    response = await fetch(options.APIURL, {
        method: 'POST',
        headers: { ...headersObj },
        body: bodyData
    }).then((res) => {
        if (res.status < 200 || res.status >= 300) {
            responseError = true;
        }
        return res.json()
    }).catch(error => {
        console.error('ERROR: ', error);
        responseError = true;
        return error;
    });

    if (responseError) {
        throw response;
    }
    else {
        // console.log('RESPONSE: ', response);
        return response;
    }
}
