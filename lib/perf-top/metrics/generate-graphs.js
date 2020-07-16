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

require('console-stamp')(console, '[HH:MM:ss.l]');

var dataGenerator = require('./util/generate-data.js');
var metricBar = require('./util/metric-bar.js');
var metricGraphs = require('../metric-graphs');
var metricLine = require('./util/metric-line.js');
var metricTable = require('./util/metric-table.js');

/**
 * Initialize all the graph objects and generate them.
 *
 * @param {object} jsonData - hashmap of dashboard configuration.
 */
function initAndStart (jsonData) {
  var graphs = new metricGraphs.metricGraphs();
  dataGenerator.getMetricUnits(jsonData.endpoint, function (metricUnits) {
    for (var graphType in jsonData.graphs) {
      for (var graphParamOption in jsonData.graphs[graphType]) {
        var graphConfig = jsonData.graphs[graphType][graphParamOption];
        var graph;
        if ((graphType === 'bars')) {
          graph = new metricBar.metricBar(jsonData.endpoint, jsonData.gridOptions, graphConfig.queryParams,
            graphConfig.options, graphs.screen);
        } else if ((graphType === 'lines')) {
          graph = new metricLine.metricLine(jsonData.endpoint, jsonData.gridOptions, graphConfig.queryParams,
            graphConfig.options, graphs.screen);
        } else if (graphType === 'tables') {
          graph = new metricTable.metricTable(jsonData.endpoint, jsonData.gridOptions, graphConfig.queryParams,
            graphConfig.options, graphs.screen, metricUnits);
        }
        graphs.allGraphs.push(graph);
      }
    }
    // Generate graph on screen
    graphs.resizeGraphsToScreen();
    graphs.start();
  });
}

module.exports.initAndStart = initAndStart;
