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

var argumentParser = require('argparse').ArgumentParser
var fs = require('fs')
var path = require('path')
var process = require('process')
var util = require('util')

var graphGenerator = require('./estop/generate-graphs.js')

// Parse command line arguments
var parser = new argumentParser({})
parser.addArgument(
  [ '--json' ],
  { help: 'json description' }
)
parser.addArgument(
  [ '--endpoint' ],
  { help: 'endpoint description' }
)
parser.addArgument(
  [ '--nodename' ],
  { help: 'nodename description' }
)
parser.addArgument(
  [ '--logfile' ],
  { help: 'logfile description' }
)
var args = parser.parseArgs()

// Load JSON data and set `endpoint` and `nodeName`
var jsonData = require(path.resolve(process.cwd(), args.json))
if (!('endpoint' in jsonData)) {
  jsonData.endpoint = 'localhost'
}
jsonData.endpoint = args.endpoint ? args.endpoint : jsonData.endpoint
jsonData = JSON.stringify(jsonData)
jsonData = jsonData.replace(/#nodeName/g, args.nodename ? args.nodename : '')
jsonData = JSON.parse(jsonData)

// Configure stderr to a logfile
var logPath = args.logfile ? path.resolve(process.cwd(), args.logfile) : '/dev/null'
var logFile = fs.createWriteStream(logPath)
console.error = function (msg) {
  logFile.write(util.format(msg) + '\n')
}

graphGenerator.initAndStart(jsonData)
