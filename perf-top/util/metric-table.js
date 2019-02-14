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
 * Creates a table graph, which represents data per node-level.
 *
 * @class
 * @param {string} endpoint - search endpoint for the HTTP request.
 * @param {object} gridOptions - defines the rows and columns of the screen and position of the graph on the screen.
 * @param {object} queryParams - hashmap of parameters for the HTTP request.
 * @param {object} options - options for contrib.table() object.
 * @param {object} screen - blessed.screen() object.
 * @param {object} metricUnits - hashmap of metrics/dimensions and their units.
 */
function metricTable (endpoint, gridOptions, queryParams, options, screen, metricUnits) {
  queryValidator.validateTableQueryParams(queryParams);
  this.endpoint = endpoint;
  this.metrics = queryParams.metrics;
  this.aggregates = queryParams.aggregates;
  this.dimensions = queryParams.dimensions;
  this.sortBy = queryParams.sortBy;
  this.nodeName = queryParams.nodeName;
  this.dimensionFilters = queryParams.dimensionFilters;

  this.labels = (this.dimensions + ',' + this.metrics + ',node').split(',');
  appendMetricUnits(this.labels, metricUnits);

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
        metrics: ${table.metrics}\n
        agg:${table.aggregates}\n
        dim:${table.dimensions}`);
    }
  });
};

/**
 * Make a HTTP request to fetch data and format the parsed response.
 *
 * @param {object} metricTable - metricTable() object
 * @param {function(object):void} callback - callback to return the tableData hashmap in the format of
 *                                           tableData = {
 *                                             dimensions: ['dim1', 'dim2', 'dim3', 'dim4'],
 *                                             data: [ [data1, data2, data3, data4], // for row1
 *                                                     [data1, data2, data3, data4] // for row2
 *                                                   ]
 *                                           }
 */
function generateMetricTableData (metricTable, callback) {
  dataGenerator.getMetricData(metricTable.endpoint, metricTable.metrics, metricTable.aggregates, metricTable.dimensions,
    function (metricData) {
      // If timestamp of the data is older 3 iterations, remove it.
      dataGenerator.removeStaleData(metricData, metricTable.dataTimestamp);

      // Get data for only one node
      if (metricTable.nodeName) {
        metricData = dataGenerator.getNodeData(metricData, metricTable.nodeName);
      }
      // Get data for only the matching dimension
      if (metricTable.dimensionFilters) {
        metricData = dataGenerator.getDimensionData(metricData, metricTable.dimensionFilters);
      }

      var aggregatedData = dataGenerator.aggregateMetricData(metricData);
      if (Object.keys(aggregatedData).length === 0) {
        callback({});
      } else {
        dataGenerator.sortDataByDecreasingOrder(aggregatedData.dimensions, aggregatedData.data, metricTable.sortBy);
        callback({ 'headers': metricTable.labels, 'data': aggregatedData.data });
      }
    });
}

/**
 * Add '(unit)' to each table column.
 *
 * @param {object} columns - table.
 * @param {object} metricUnits - hashmap object of {column : unit}.
 */
function appendMetricUnits (columns, metricUnits) {
  for (var i = 0; i < columns.length; i++) {
    if (columns[i] in metricUnits) {
      columns[i] = `${columns[i]} (${metricUnits[columns[i]]})`;
    }
  }
  return columns;
}

module.exports.metricTable = metricTable;
