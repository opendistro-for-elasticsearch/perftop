/*
 * Copyright <2019> Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */


var http = require('http');
var https = require('https');
var url = require('url');

/**	
 * Gets a URL option with host, port (default = 80), and path for http(s).request().	
 *	
 * @param {string} endpoint - endpoint for the query.	
 * @param {string} path - metric query request path.	
 */	
function getURLOptions (endpoint, path) {	
    endpoint = ( endpoint.startsWith('http://') || endpoint.startsWith('https://') ) ? endpoint : 'http://' + endpoint;	
    var parsedURL = url.parse(url.resolve(endpoint, path));
    return {
      protocol: parsedURL.protocol,	
      host: parsedURL.hostname,	
      auth: parsedURL.auth,	
      port: (parsedURL.port === null) ? (parsedURL.protocol === 'https:' ? 443 : 80 ): parsedURL.port,	
      path: parsedURL.path	
    };	
  }	

/**	
 * Makes a HTTP(S) request and returns the response.	
 *	
  * @param {string} urlOptions - URL option for the HTTP(S) request.	
  * @param {string} done - callback for the HTTP(S) response.	
  */	
function makeRequest (urlOptions, done) {	
  var rawData = '';	
  var respond = function (response) {	
    response.on('data', function (chunk) {	
      rawData += chunk;	
    });	
    response.on('end', function () {	
      done(rawData);	
    });	
  };	
  var client = http;	
  if (urlOptions.protocol === "https:") {
    client = https;	
    urlOptions.rejectUnauthorized = false;	
  }	
  var req = client.request(urlOptions, respond);	
  req.on('error', function (error) {	
    console.error(error);	
    done('');	
  });	
  req.end();	
}
	
/**	
 * Convert and parse a string to a number.	
 *	
 * @param {string} data - string	
 * @returns {number|string} - if `data` cannot be converted to a number, return `data` back,	
 *                            else return the number (with maximum of 2 decimal points if less than 100,	
 *                            else a rounded integer).	
 */	
function parseNumberData (data) {	
    if (data === null) {	
      return 'null';	
    } else if (data === '') {	
      return data;	
    }	
    var parsedData = Math.round(data * 100) / 100;	
    if (isNaN(parsedData)) {	
      return data;	
    } else if (parsedData < 100) {	
      return parsedData;	
    } else {	
      return Math.round(parsedData);	
    }	
  }

module.exports.makeRequest = makeRequest;
module.exports.getURLOptions = getURLOptions;
module.exports.parseNumberData = parseNumberData;
