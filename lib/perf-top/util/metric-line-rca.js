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

/**
 * Creates the line graph, which represents data on per node level.
 *
 * @class
 * @param {string} endpoint - search endpoint for the HTTP request.
 * @param {object} gridOptions - defines the rows and columns of the screen and position of the graph on the screen.
 * @param {object} queryParams - hashmap of parameters for the HTTP request.
 * @param {object} options - options for contrib.line() object.
 * @param {string} dimension - dimension of RCA to be analyzed.
 * @param {string} graphParams - the parameter to be rendered in the graph.
 * @param {object} screen - blessed.screen() object.
 */
function metricLineRCA (endpoint, gridOptions, queryParams, options, dimension, graphParams, screen) {
  this.endpoint = endpoint;
  this.name = queryParams.name;
  this.local = queryParams.local; 
  this.dimension = dimension;
  this.graphParams = graphParams;
  this.lines = {};
  this.refreshInterval = (options.refreshInterval > 5000) ? options.refreshInterval : 5000;

  var grid = new contrib.grid({ rows: gridOptions.rows, cols: gridOptions.cols, screen: screen });
  this.line = grid.set(options.gridPosition.row, options.gridPosition.col, options.gridPosition.rowSpan,
    options.gridPosition.colSpan, contrib.line, options);

  this.xAxis = options.xAxis;
  this.yAxis = Array.apply(null, new Array(this.xAxis.length)).map(Number.prototype.valueOf, 0);
  this.colors = options.colors || [];

  this.dataTimestamp = {};
}

/**
 * Wrapper to attach the line object to screen.
 */
metricLineRCA.prototype.emit = function () {
  this.line.emit('attach');
};

/**
 * Render the line graph.
 *
 * @param {object} line - metricLine() object.
 * @param {object} screen - blessed.screen() object.
 */
metricLineRCA.prototype.generateGraph = function (line, screen) {
  generateAndUpdateLineData(line);
  screen.render();
};

/**
 * Given an array of lineData, pop the 0th data and append newData value.
 *
 * @param {Array} lineData - array of data.
 * @param {number} newData - most recent data.
 */
function updateLineData (lineData, newData) {
  lineData.y.shift();
  lineData.y.push(newData);
  return lineData;
}

/**
 * Make a HTTP request to fetch data, parse and format the data, and update the lines with new data.
 * Line data will be in the format of     
 *   lineData = {
 *     line1: {
 *       title: 'title1',
 *       x: [t1, t2, t3, t4, ...], // x-axis; defined by metricLine.xAxis
 *       y: [data1, data2, data3, data4] // new data will be appended to the end of this list and old data popped off.
 *     },
 *     line2: {
 *       title: 'title2'
 *       x: [t1, t2, t3, t4, ...], // x-axis; defined by metricLine.xAxis
 *       y: [data1, data2, data3, data4] // new data will be appended to the end of this list and old data popped off.
 *     }
 *   }  
 * 
 * @param {object} metricLine - metricLine() object.
 */
function generateAndUpdateLineData (metricLine) {
  dataGenerator.getMetricDataRCA(metricLine.endpoint, metricLine.name, metricLine.local, metricLine.dimension, metricLine.graphParams, "lines",
    function (metricData) { 
      if (metricData.fields === null || metricData.fields.length === 0) {
        console.error(`Metric was not found for request with queryParams:\n
        endpoint: ${metricLine.endpoint}\n
        name: ${metricLine.name}\n
        local: ${metricLine.local}\n`);
        return;
      }   
      dataGenerator.removeStaleDataRCA(metricData, metricLine);
      var field = metricLine.dimension + " - " + metricLine.graphParams;
      if (!Object.keys(metricLine.lines).includes(field)) {
        metricLine.lines[field] = { 
          title: metricLine.graphParams,
          style: { line: randomColor(metricLine.colors) },
          x: metricLine.xAxis,
          y: metricLine.yAxis.slice(0, metricLine.yAxis.length)
        };
      }
      updateLineData(metricLine.lines[field], metricData.data[0]);
      for (lineName in metricLine.lines) {
        if (!(metricData.fields.includes(lineName))) {
          delete metricLine.lines[lineName];
        }
      }
      var allLines = metricLine.lines[field];
      metricLine.line.setData(allLines); 
    });
}


/**
 * Return a random color.
 *
 * @param {Array} colorChoices - Array of random colors (in number format) to choose from.
 *                               If empty, then return a random color from 0-255.
 */
function randomColor (colorChoices) {
  if (colorChoices.length === 0) {
    return [Math.random() * 255, Math.random() * 255, Math.random() * 255];
  } else {
    return colorChoices[Math.floor(Math.random() * colorChoices.length)];
  }
}

module.exports.metricLineRCA = metricLineRCA;
