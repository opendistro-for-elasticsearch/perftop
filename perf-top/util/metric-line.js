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

var contrib = require('blessed-contrib')
var dataGenerator = require('./generate-data.js')
var queryValidator = require('./validate-query-params.js')

/**
 * Creates the line graph, which represents data on per node level.
 *
 * @class
 * @param {string} endpoint - search endpoint for the HTTP request.
 * @param {object} gridOptions - defines the rows and columns of the screen and position of the graph on the screen.
 * @param {object} queryParams - hashmap of parameters for the HTTP request.
 * @param {object} options - options for contrib.line() object.
 * @param {object} screen - blessed.screen() object.
 */
function metricLine (endpoint, gridOptions, queryParams, options, screen) {
  queryValidator.validateLineQueryParams(queryParams)
  this.endpoint = endpoint
  this.metrics = queryParams.metrics
  this.aggregates = queryParams.aggregates
  this.dimensions = queryParams.dimensions
  this.nodeName = queryParams.nodeName
  this.dimensionFilters = queryParams.dimensionFilters

  this.lines = {}

  this.refreshInterval = options.refreshInterval

  var grid = new contrib.grid({ rows: gridOptions.rows, cols: gridOptions.cols, screen: screen })
  this.line = grid.set(options.gridPosition.row, options.gridPosition.col, options.gridPosition.rowSpan,
    options.gridPosition.colSpan, contrib.line, options)

  this.xAxis = options.xAxis
  // Initialize the data with '0's
  this.yAxis = Array.apply(null, new Array(this.xAxis.length)).map(Number.prototype.valueOf, 0)
  this.colors = options.colors || []
}

/**
 * Wrapper to attach the line object to screen.
 */
metricLine.prototype.emit = function () {
  this.line.emit('attach')
}

/**
 * Render the line graph.
 *
 * @param {object} line - metricLine() object.
 * @param {object} screen - blessed.screen() object.
 */
metricLine.prototype.generateGraph = function (line, screen) {
  generateAndUpdateLineData(line)
  screen.render()
}

/**
 * Given an array of lineData, pop the 0th data and append newData value.
 *
 * @param {Array} lineData - array of data.
 * @param {number} newData - most recent data.
 */
function updateLineData (lineData, newData) {
  lineData.y.shift()
  lineData.y.push(newData)
  return lineData
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
  dataGenerator.getMetricData(metricLine.endpoint, metricLine.metrics, metricLine.aggregates, metricLine.dimensions,
    function (metricData) {
      if (metricLine.nodeName) {
        var metricData = dataGenerator.getNodeData(metricData, metricLine.nodeName)
      }

      if (metricLine.dimensionFilters) {
        var metricData = dataGenerator.getDimensionData(metricData, metricLine.dimensionFilters)
      }

      var lineNames = Object.keys(metricData)
      if (lineNames.length === 0) {
        console.error(`Metric was not found for request with queryParams:\n
        endpoint: ${metricLine.endpoint}\n
        metrics: ${metricLine.metrics}\n
        agg:${metricLine.aggregates}\n
        dim:${metricLine.dimensions}`)
        return
      }

      for (var i = 0; i < lineNames.length; i++) {
        var lineName = lineNames[i]
        var lineData = metricData[lineName]

        var metricIndex = lineData.fields.findIndex(metricName => metricName === metricLine.metrics)

        // Aggregate (sum) the data value
        var aggData = 0
        lineData.data.forEach(function (data) {
          aggData += data[metricIndex]
        })
        aggData = Math.round(aggData * 100) / 100

        // Initialize the line
        if (!Object.keys(metricLine.lines).includes(lineName)) {
          metricLine.lines[lineName] = {
            title: lineNames[i],
            style: { line: randomColor(metricLine.colors) },
            x: metricLine.xAxis,
            y: metricLine.yAxis.slice(0, metricLine.yAxis.length)
          }
        }

        updateLineData(metricLine.lines[lineName], aggData)
      }
      var allLines = Object.keys(metricLine.lines).map(function (line) {
        return metricLine.lines[line]
      })
      metricLine.line.setData(allLines)
    })
}

/**
 * Return a random color.
 *
 * @param {Array} colorChoices - Array of random colors (in number format) to choose from.
 *                               If empty, then return a random color from 0-255.
 */
function randomColor (colorChoices) {
  if (colorChoices.length === 0) {
    return [Math.random() * 255, Math.random() * 255, Math.random() * 255]
  } else {
    return colorChoices[Math.floor(Math.random() * colorChoices.length)]
  }
}

module.exports.metricLine = metricLine
