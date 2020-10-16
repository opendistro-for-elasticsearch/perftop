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

/**
 * Creates a table graph, which represents data per node-level.
 *
 * @class
 * @param {string} endpoint - search endpoint for the HTTP request.
 * @param {object} gridOptions - defines the rows and columns of the screen and position of the graph on the screen.
 * @param {object} queryParams - hashmap of parameters for the HTTP request.
 * @param {object} options - options for contrib.table() object.
 * @param {string} dimension - dimension of RCA to be analyzed.
 * @param {string} graphParams - the parameter to be rendered in the graph.
 * @param {object} dataGenerator - the data generator for the rca dimension
 * @param {object} screen - blessed.screen() object.
 */
function metricTable (endpoint, gridOptions, queryParams, options, dimension, graphParams, dataGenerator, screen) {
  this.endpoint = endpoint;
  this.name = queryParams.name;
  this.local = queryParams.local;
  this.dimension = dimension;
  this.graphParams = graphParams;
  this.labels = (options.columns).split(',');
  this.dataGenerator = dataGenerator;
  options.columnWidth = this.labels.map(label => label.length + 10);
  this.refreshInterval = (options.refreshInterval > 5000) ? options.refreshInterval : 5000;

  var grid = new contrib.grid({ rows: gridOptions.rows, cols: gridOptions.cols, screen: screen });
  this.table = grid.set(options.gridPosition.row, options.gridPosition.col, options.gridPosition.rowSpan, options.gridPosition.colSpan,
    contrib.table, options);

  this.dataTimestamp = {};
}

/**
 * Wrapper to attach the table object to screen.
 */
metricTable.prototype.emit = function () {
  this.table.emit('attach');
};

/**
 * Render the table graph.
 *
 * @param {object} table - metricTable object.
 * @param {object} screen - blessed.screen() object.
 */
metricTable.prototype.generateGraph = function (table, screen) {
  generateMetricTableData(table, function (tableData) {
    if (Object.keys(tableData).length !== 0) {
      table.table.setData(tableData);
      screen.render();
    } else {
      console.error(`Metric was not found for request with queryParams:\n
        endpoint: ${table.endpoint}\n
        name: ${table.name}\n
        local: ${table.local}\n`);
    }
  });
};

/**
 * Make a HTTP request to fetch data and format the parsed response.
 *
 * @param {object} metricTable - metricTable() object.
 * @param {function(object):void} callback - callback to return the tableData hashmap in the format of
 *                                           tableData = {
 *                                             headers: ['header1', 'header2', 'header3', 'header4'],
 *                                             data: [ [data1, data2, data3, data4], // for row1
 *                                                     [data1, data2, data3, data4] // for row2
 *                                                   ]
 *                                           }
 */
function generateMetricTableData (metricTable, callback) {
  var dataGenerator = metricTable.dataGenerator;
  dataGenerator.getMetricData(metricTable.endpoint, metricTable.name, metricTable.local, metricTable.dimension, metricTable.graphParams, "tables",
    function (metricData) {
      if (metricData.fields === null || metricData.fields.length === 0) {
        callback({});
      }
      dataGenerator.removeStaleData(metricData, metricTable);
      if (metricData.fields.length === 0) {
        callback({});
      } else {
        for (var i = 0; i < metricTable.labels.length; i++) {
          if (!(metricData.fields.includes(metricTable.labels[i]))) {             
            for ( var j = 0; j < metricData.data.length; j++) {
              metricData.data[j].splice(i, 0, 0);
            }
          }
        }
        callback({ 'headers': metricTable.labels, 'data': metricData.data });
      }
    });
}

module.exports.metricTable = metricTable;
