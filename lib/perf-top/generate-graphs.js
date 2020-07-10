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
var metricDonutTemperatureRCA = require('./util/metric-donut-temperaturerca.js');
var metricGraphs = require('./util/metric-graphs.js');
var metricLine = require('./util/metric-line.js');
var metricLineTemperatureRCA = require('./util/metric-line-temperaturerca.js');
var metricTable = require('./util/metric-table.js');
var metricTableTemperatureRCA = require('./util/metric-table-temperaturerca.js');


/**
 * Initialize all the graph objects and generate them
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
    graphs.resizeGraphsToScreen();
    graphs.start();
  });
}


/**
 * Initialize all the graph objects and generate them for temperature analysis.
 *
 * @param {object} jsonData - hashmap of dashboard configuration.
 */

function initAndStartTemperatureAnalysis (jsonData) {
  var graphs = new metricGraphs.metricGraphs();
  dataGenerator.getMetricUnits(jsonData.endpoint, function (metricUnits) { 
    var queryParams = jsonData.queryParams;
    for (var i = 0; i < jsonData.graphs.length; i++) {
      var graphConfig = jsonData.graphs[i];
      var graphType = graphConfig.graphType;
      if ((graphType === 'donuts')) {
        graph = new metricDonutTemperatureRCA.metricDonutTemperatureRCA(jsonData.endpoint, jsonData.gridOptions, queryParams,
          graphConfig.options, graphConfig.dimension, graphConfig.graphParams, graphs.screen);
      } else if ((graphType === 'lines')) {
        graph = new metricLineTemperatureRCA.metricLineTemperatureRCA(jsonData.endpoint, jsonData.gridOptions, queryParams,
          graphConfig.options, graphConfig.dimension, graphConfig.graphParams, graphs.screen);
      } else if (graphType === 'tables') {
        graph = new metricTableTemperatureRCA.metricTableTemperatureRCA(jsonData.endpoint, jsonData.gridOptions, queryParams,
          graphConfig.options, graphConfig.dimension, graphConfig.graphParams, graphs.screen);
      }
      graphs.allGraphs.push(graph);
    }
    graphs.resizeGraphsToScreen();
    graphs.start();
  });
}

module.exports.initAndStart = initAndStart;
module.exports.initAndStartTemperatureAnalysis = initAndStartTemperatureAnalysis;
