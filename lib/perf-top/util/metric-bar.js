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

var contrib = require('blessed-contrib');
var dataGenerator = require('./generate-data.js');
var queryValidator = require('./validate-query-params.js');

/**
 * Creates the bar graph, which aggregates data on all nodes unless 'nodeName' defined.
 *
 * @class
 * @param {string} endpoint - search endpoint for the HTTP request.
 * @param {object} gridOptions - defines the rows and columns of the screen and position of the graph on the screen.
 * @param {object} queryParams - hashmap of parameters for the HTTP request.
 * @param {object} options - options for contrib.bar() object.
 * @param {object} screen - blessed.screen() object.
 */
function metricBar (endpoint, gridOptions, queryParams, options, screen) {
  this.endpoint = endpoint;
  this.metrics = queryParams.metrics;
  this.aggregates = queryParams.aggregates;
  this.dimensions = queryParams.dimensions;
  this.nodeName = queryParams.nodeName;
  this.dimensionFilters = queryParams.dimensionFilters;

  this.refreshInterval = (options.refreshInterval > 5000) ? options.refreshInterval : 5000;

  var grid = new contrib.grid({ rows: gridOptions.rows, cols: gridOptions.cols, screen: screen });
  this.bar = grid.set(options.gridPosition.row, options.gridPosition.col, options.gridPosition.rowSpan,
    options.gridPosition.colSpan, contrib.bar, options);

  this.dataTimestamp = {};
}


/**
 * Wrapper to attach the bar object to screen.
 */
metricBar.prototype.emit = function () {
  this.bar.emit('attach');
};

/**
 * Render the bar graph.
 *
 * @param {object} bar - metricBar() object.
 * @param {object} screen - blessed.screen() object.
 */
metricBar.prototype.generateGraph = function (bar, screen) {
  generateMetricBarData(bar, function (barData) {
    if (Object.keys(barData).length !== 0) {
      bar.bar.setData(barData);
      screen.render();
    } else {
      console.error(`Metric was not found for request with queryParams:\n
        endpoint: ${bar.endpoint}\n
        metrics: ${bar.metrics}\n
        agg:${bar.aggregates}\n
        dim:${bar.dimensions}`);
    }
  });
};

/**
 * Make a HTTP request to fetch data and format the parsed response for the bar graph.
 *
 * @param {object} metricBar - metricBar() object
 * @param {function(object):void} callback - callback to return barData in the format of
 *                                           barData = { titles: ['bar1', 'bar2', 'bar3', 'bar4'],
 *                                                       data: [data1, data2, data3, data4] }
 */
function generateMetricBarData (metricBar, callback) {
  dataGenerator.getMetricData(metricBar.endpoint, metricBar.metrics, metricBar.aggregates, metricBar.dimensions, function (metricData) {
    // If timestamp of the data is older 3 iterations, remove it.
    dataGenerator.removeStaleData(metricData, metricBar.dataTimestamp);

    // Get data for only one node
    if (metricBar.nodeName) {
      metricData = dataGenerator.getNodeData(metricData, metricBar.nodeName);
    }
    // Get data for only the matching dimension
    if (metricBar.dimensionFilters) {
      metricData = dataGenerator.getDimensionData(metricData, metricBar.dimensionFilters);
    }

    var aggregatedData = dataGenerator.aggregateMetricData(metricData);
    if (Object.keys(aggregatedData).length === 0) {
      callback(aggregatedData);
      return;
    }

    var dimensionIndex = aggregatedData.dimensions.findIndex(dimensionName => dimensionName === metricBar.dimensions);
    var metricIndex = aggregatedData.dimensions.findIndex(metricName => metricName === metricBar.metrics);

    // Aggregate (sum) the data value by dimension
    var aggData = {};
    aggregatedData.data.forEach(function (data) {
      var dataDimension = data[dimensionIndex];
      if (data[metricIndex] === null) {
        data[metricIndex] = 0;
      }
      if (!aggData[dataDimension]) {
        aggData[dataDimension] = data[metricIndex];
      } else {
        aggData[dataDimension] += data[metricIndex];
        aggData[dataDimension] = Math.round(aggData[dataDimension] * 100) / 100;
      }
    });

    // Sort by bar names
    var barTitles = Object.keys(aggData);
    barTitles.sort();

    // Format data to a 2D array
    var barData = [];
    for (var i = 0; i < barTitles.length; i++) {
      var title = barTitles[i];
      barData.push(aggData[title]);
    }
    callback({ titles: barTitles, data: barData });
  });
}

module.exports.metricBar = metricBar;
