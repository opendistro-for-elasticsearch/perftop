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

var temperatureProfileDataGenerator = require('./util/temperature-profile/generate-data.js');
var heapUsageProfileDataGenerator = require('./util/HeapUsage-profile/generate-data');
var metricGraphs = require('../metric-graphs');
var metricDonut = require('./util/metric-donut');
var metricLine = require('./util/metric-line.js');
var metricTable = require('./util/metric-table.js');

/**
 * Initialize all the graph objects and generate RCA analysis.
 *
 * @param {object} jsonData - hashmap of dashboard configuration.
 */
function initAndStart (jsonData) {
  var graphs = new metricGraphs.metricGraphs();
  var dataGenerator = selectDataGenerator(jsonData);
  var queryParams = jsonData.queryParams;
  for (var i = 0; i < jsonData.graphs.length; i++) {
    var graphConfig = jsonData.graphs[i];
    var graphType = graphConfig.graphType;
    console.log("dimension: " + graphConfig.dimension);
    if ((graphType === 'donuts')) {
      graph = new metricDonut.metricDonut(jsonData.endpoint, jsonData.gridOptions, queryParams,
        graphConfig.options, graphConfig.dimension, graphConfig.graphParams, dataGenerator, graphs.screen);
    } else if ((graphType === 'lines')) {
      graph = new metricLine.metricLine(jsonData.endpoint, jsonData.gridOptions, queryParams,
        graphConfig.options, graphConfig.dimension, graphConfig.graphParams, dataGenerator, graphs.screen);
    } else if (graphType === 'tables') {
      graph = new metricTable.metricTable(jsonData.endpoint, jsonData.gridOptions, queryParams,
        graphConfig.options, graphConfig.dimension, graphConfig.graphParams, dataGenerator, graphs.screen);
    }
    graphs.allGraphs.push(graph);
  }
  // Generate graph on screen
  graphs.resizeGraphsToScreen();
  graphs.start();
}

/**
 * Select the data generator based on the query name in jsonData
 *
 * @param {object} jsonData - hashmap of dashboard configuration.
 */
function selectDataGenerator(jsonData){
  switch(jsonData.queryParams.name){
    case 'AllTemperatureDimensions':
      return temperatureProfileDataGenerator;
    case 'HighHeapUsageClusterRca':
      return heapUsageProfileDataGenerator;
  }
}

module.exports.initAndStart = initAndStart;
