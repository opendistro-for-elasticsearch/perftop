/*
 * Copyright <2019> Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributedistable
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing  
 * permissions and limitations under the License.
 */

var contrib = require('blessed-contrib');

/**
 * Creates the donut graph, which aggregates data on all nodes unless 'nodeName' defined.
 *
 * @class
 * @param {string} endpoint - search endpoint for the HTTP request.
 * @param {object} gridOptions - defines the rows and columns of the screen and position of the graph on the screen.
 * @param {object} queryParams - hashmap of parameters for the HTTP request.
 * @param {object} options - options for contrib.donut() object.
 * @param {string} dimension - dimension of RCA to be analyzed.
 * @param {string} graphParams - the parameter to be rendered in the graph.
 * @param {object} dataGenerator - the data generator for the rca dimension
 * @param {object} screen - blessed.screen() object.
 */
function metricDonut (endpoint, gridOptions, queryParams, options, dimension, graphParams, dataGenerator, screen) {
    this.endpoint = endpoint;
    this.name = queryParams.name;
    this.local = queryParams.local;
    this.dimension = dimension;
    this.graphParams = graphParams;
    this.dataGenerator = dataGenerator;
    this.refreshInterval = (options.refreshInterval > 5000) ? options.refreshInterval : 5000;

    var grid = new contrib.grid({ rows: gridOptions.rows, cols: gridOptions.cols, screen: screen });
    this.donut = grid.set(options.gridPosition.row, options.gridPosition.col, options.gridPosition.rowSpan, options.gridPosition.colSpan, contrib.donut, options);

    this.dataTimestamp = {};
}


/**
 * Wrapper to attach the donut object to screen.
 */
metricDonut.prototype.emit = function () {
  this.donut.emit('attach');
};

/**
 * Render the donut graph.
 *
 * @param {object} donut - metricDonut() object.
 * @param {object} screen - blessed.screen() object.
 */
metricDonut.prototype.generateGraph = function (donut, screen) {
  generateMetricDonutData(donut, function (donutData) { ///problem
    if (Object.keys(donutData).length !== 0) {
      donut.donut.setData(donutData);
      screen.render();
    } else {
      console.error(`Metric was not found for request with queryParams:\n
        endpoint: ${donut.endpoint}\n
        name: ${donut.name}\n
        local: ${donut.local}\n`);
    }
  });
};

/**
 * Make a HTTP request to fetch data and format the parsed response for the donut graph.
 * 
 * @param {object} metricDonut - metricDonut() object.
 * @param {function(object):void} callback - callback to return donutData in the format of
 *                                           donutData = [
 *                                                 { percent: Int, label: String, 'color': String },
 *                                                 { percent: Int, label: String, 'color': String }
 *                                               ]                                              
 */
function generateMetricDonutData (metricDonut, callback) {
  var dataGenerator = metricDonut.dataGenerator;
  dataGenerator.getMetricData(metricDonut.endpoint, metricDonut.name, metricDonut.local, metricDonut.dimension, metricDonut.graphParams, "donuts", function (metricData) {
    dataGenerator.removeStaleData(metricData, metricDonut);
    var color = ["red", "yellow", "green", "blue"];
    var donutData = [];
    var count = metricData.data.reduce(function(a, b) {
      return a + b;
    }, 0);
    for (var i = 0; i < metricData.fields.length; i++) {
      var donutLabel = metricData.fields[i];
      var donutColor = color[i];
      var donutPercentage = (metricData.data[i] / count) * 100;
      donutData.push({percent: donutPercentage, label: donutLabel, color: donutColor});
    }
    callback(donutData);
  });
}

module.exports.metricDonut = metricDonut;
