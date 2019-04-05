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

var argumentParser = require('argparse').ArgumentParser;
var fs = require('fs');
var path = require('path');
var process = require('process');
var util = require('util');

var clusterOverviewJSON = require('./dashboards/ClusterOverview.json');
var clusterNetworkMemoryAnalysisJSON = require('./dashboards/ClusterNetworkMemoryAnalysis.json');
var clusterThreadAnalysisJSON = require('./dashboards/ClusterThreadAnalysis.json');
var nodeAnalysisJSON = require('./dashboards/NodeAnalysis.json');

var graphGenerator = require('./perf-top/generate-graphs.js');

// Parse command line arguments
var parser = new argumentParser({
  description: 'For "Getting Started" guide and documentation, visit https://opendistro.github.io/for-elasticsearch-docs' });

parser.addArgument(
  [ '--dashboard' ],
  { required: true,
    help: 'Relative path to the dashboard configuration JSON. ' +
    'To load preset dashboard, this may also be: ' +
    '(1) ClusterOverview, (2) ClusterNetworkMemoryAnalysis, ' +
    '(3) ClusterThreadAnalysis, or (4) NodeAnalysis. (e.g. "--dashboard ClusterOverview")'}
);
parser.addArgument(
  [ '--endpoint' ],
  { help: 'Endpoint for the Performance Analyzer queries. ' +
  'This can also be defined in the JSON.' }
);
parser.addArgument(
  [ '--nodename' ],
  { help: 'Value to replace "#nodeName" in the JSON.' }
);
parser.addArgument(
  [ '--logfile' ],
  { help: 'File to redirect STDERR to. If undefined, redirect to "/dev/null".' }
);
var args = parser.parseArgs();

// Load JSON data and set `endpoint` and `nodeName`
var jsonData;
if (args.dashboard === 'ClusterOverview') {
  jsonData = clusterOverviewJSON;
} else if (args.dashboard === 'ClusterNetworkMemoryAnalysis') {
  jsonData = clusterNetworkMemoryAnalysisJSON;
} else if (args.dashboard === 'ClusterThreadAnalysis') {
  jsonData = clusterThreadAnalysisJSON;
} else if (args.dashboard === 'NodeAnalysis') {
  jsonData = nodeAnalysisJSON;
} else {
  jsonData = require(path.resolve(process.cwd(), args.dashboard));
}

if (!('endpoint' in jsonData)) {
  jsonData.endpoint = 'localhost';
}
jsonData.endpoint = args.endpoint ? args.endpoint : jsonData.endpoint;
jsonData = JSON.stringify(jsonData);
jsonData = jsonData.replace(/#nodeName/g, args.nodename ? args.nodename : '');
jsonData = JSON.parse(jsonData);

// Configure stderr to a logfile
var logPath = args.logfile ? path.resolve(process.cwd(), args.logfile) : '/dev/null';
var logFile = fs.createWriteStream(logPath);
console.error = function (msg) {
  logFile.write(util.format(msg) + '\n');
};

graphGenerator.initAndStart(jsonData);