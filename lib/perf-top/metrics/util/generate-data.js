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

var helper = require("../../helper");
/**
 * Makes a HTTP(S) request to "{endpoint}/_opendistro/_performanceanalyzer/metrics?metrics=${metrics}&agg=${aggregates}&dim=${dimensions}&nodes=all"
 * and parses the response to a hashmap object.
 *
 * @param {string} endpoint - endpoint for the metric query.
 * @param {string} metrics - metric fields to fetch data for.
 * @param {string} aggregates - aggregate fields for the metric fields.
 * @param {string} dimensions - dimension fields to group the metrics by.
 * @param {function(object):void} done - callback to be called when the response is parsed into a hashmap object.
 */
function getMetricData (endpoint, metrics, aggregates, dimensions, done) {
  var metricParam = (metrics) ? `metrics=${metrics}` : 'metrics=';
  var aggParam = (aggregates) ? `&agg=${aggregates}` : '&agg=';
  var dimParam = (dimensions) ? `&dim=${dimensions}` : '&dim=';

  var urlOptions = helper.getURLOptions(endpoint, `/_opendistro/_performanceanalyzer/metrics?${metricParam}${aggParam}${dimParam}&nodes=all`);

  helper.makeRequest(urlOptions, function (response) {
    if (response === '') {
      done({});
    } else {
      done(getDataPerNode(response));
    }
  });
}

/**
 * Makes a HTTP(S) request to "{endpoint}/_opendistro/_performanceanalyzer/metrics/units"
 * and parses the response to a hashmap object.
 *
 * @param {string} endpoint - endpoint for the query.
 * @param {string} done - callback for the HTTP(S) response.
 */
function getMetricUnits (endpoint, done) {
  var urlOptions = helper.getURLOptions(endpoint, '/_opendistro/_performanceanalyzer/metrics/units');
  helper.makeRequest(urlOptions, function (response) {
    if (response === '') {
      console.error('Failed to retrieve units for metrics. HTTP(S) response was empty.');
      done({});
    }
    try {
      var jsonData = JSON.parse(response);
      if (Object.keys(jsonData).length === 1 && 'error' in jsonData) {
        console.error(`Failed to retrieve units for metrics. HTTP(S) response was:
          ${response}`);
        done({});
      }
      done(jsonData);
    } catch (e) {
      console.error(`HTTP(S) Response for metricUnits was not in JSON format:
        ${response}`);
      done({});
    }
  });
}

/**
 * Sort a 2D array by the `sortBy` column in the decreasing order.
 *
 * @param {Array} dimensions - string array that represents the name of the columns for `data`.
 * @param {Array} data - 2D array to sort.
 * @param {string} sortBy - a string value from `dimensions` to sort the `data` by.
 */
function sortDataByDecreasingOrder (dimensions, data, sortBy) {
  var sortByIndex = dimensions.indexOf(sortBy);
  data.sort(function (a, b) {
    return b[sortByIndex] - a[sortByIndex];
  });
}

/**
 * Given a 2D array of data, modify all columns with only numbers by adding a comma delimiter to the elements.
 *
 * @param {Array} data - 2D array to modify.
 */
function addCommaDelimiter (data) {
  if (data.length === 0) {
    return;
  }
  var numColumn = data[0].length;
  for (var column = 0; column < numColumn; column++) {
    var dataColumn = data.map( function(row, y) { return row[column] } );
    if (dataColumn.every( function(dataValue) { return typeof dataValue === 'number' } )) {
      for (var row = 0; row < data.length; row++) {
        data[row][column] = data[row][column].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
    }
  }
}

/**
 * Given a hashmap of dimensions and data per node, flatten it to a hashmap of 1 dimensions array and 1 data 2D array.
 *
 * @param {object} metricData - hashmap object in the format of
 *                              { nodeName1: { fields: [dim1, dim2] ,
 *                                        data: [[data1], [data2]],
 *                                        timestamp: timestamp },
 *                                nodeName2: { fields: [dim1, dim2] ,
 *                                        data: [[data3], ...],
 *                                        timestamp: timestamp } }
 * @returns {object} - { dimensions: [dim1, dim2, node],
 *                       data: [[data1, nodeName1], [data2, nodeName1], [data3, nodeName2], ...]}
 */
function aggregateMetricData (metricData) {
  var allDimensions = new Set();
  var allData = [];
  for (var nodeName in metricData) {
    if (nodeName === '' || typeof metricData[nodeName] === 'undefined') {
      console.error(`Undefined data:\n
              ${metricData[nodeName]}`);
      continue;
    }
    metricData[nodeName].fields.forEach(function (dimensions) {
      allDimensions.add(dimensions);
    });

    metricData[nodeName].data.forEach(function (data) {
      data.push(nodeName);
      allData.push(data);
    });
  }
  allDimensions = Array.from(allDimensions);
  allDimensions.push('node');

  return { dimensions: allDimensions, data: allData };
}

/**
 * Given a string HTTP(S) response, parse and return the data into a hashmap
 *
 * @param {object} rawData - string response from the HTTP(S) request that can be parsed into a JSON object.
 * @returns {object} - returns a hashmap in the format of
 *                     { nodeName1: { fields: [dim1, dim2, ...] ,
 *                                   data: [[data], [data], ...],
 *                                        timestamp: timestamp },
 *                       nodeName2: { fields: [dim1, dim2, ...] ,
 *                                   data: [[data], [data], ...],
 *                                        timestamp: timestamp } }
 */
function getDataPerNode (rawData) {
  var jsonData = {};
  try {
    jsonData = JSON.parse(rawData);
    if (Object.keys(jsonData).length === 1 && 'error' in jsonData) {
      console.error(`Failed to retrieve data for metrics. HTTP(S) response was:
        ${rawData}`);
      return {};
    }
  } catch (e) {
    console.error(`HTTP(S) Response for per-node data was not in JSON format:
      ${rawData}`);
    return {};
  }

  var allData = {};
  for (var nodeName in jsonData) {
    var nodeDimensions = [];
    var nodeData = [];
    if (!('data' in jsonData[nodeName])) {
      console.error(`Data returned for nodeName=${nodeName} was in an unexpected format:
        ${JSON.stringify(jsonData[nodeName])}`);
      continue;
    }
    if (!('fields' in jsonData[nodeName].data) && !('records' in jsonData[nodeName].data)) {
      console.error(`Data returned for nodeName=${nodeName} was in an unexpected format:
        ${JSON.stringify(jsonData[nodeName])}`);
      continue;
    }
    jsonData[nodeName].data.fields.forEach(function (field) {
      if (field.name === null) {
        field.name = 'N/A';
      }
      nodeDimensions.push(field.name);
    });
    jsonData[nodeName].data.records.forEach(function (record) {
      nodeData.push(record.map(helper.parseNumberData));
    });

    allData[nodeName] = { fields: nodeDimensions, data: nodeData, timestamp: jsonData[nodeName].timestamp };
  }
  return allData;
}

/**
 * Given a hashmap of dimensions and data per node, return the hashmap of data for one node.
 *
 * @param {object} metricData - hashmap object in the format of
 *                              { nodeName1: { fields: [dim1, dim2] ,
 *                                        data: [[data1], [data2]],
 *                                        timestamp: timestamp },
 *                                nodeName2: { fields: [dim1, dim2] ,
 *                                        data: [[data3], ...],
 *                                        timestamp: timestamp } }
 * @param {object} nodeName - name or prefix of the node to return the data for.
 * @returns {object} - { nodeName: { fields: [dim1, dim2] ,
 *                                   data: [[data1], [data2]],
 *                                   timestamp: timestamp } }

 */
function getNodeData (metricData, nodeName) {
  var node = Object.keys(metricData).filter(lineName => lineName.startsWith(nodeName));
  var nodeData = {};
  if (node.length === 0) {
    console.error(`No matches for nodeName=${nodeName}`);
  } else if (node.length > 1) {
    console.error(`Too many matches for nodeName=${nodeName}`);
  } else {
    nodeData[node[0]] = metricData[node];
  }
  return nodeData;
}

/**
 * Given a hashmap of dimensions and data per node and a dimension value,
 * return the hashmap of data for the interested dimension(s).
 *
 * @param {object} metricData - hashmap object in the format of
 *                              { nodeName1: { fields: [dim1, dim2, dim3] ,
 *                                        data: [[data1], [data2]],
 *                                        timestamp: timestamp },
 *                                nodeName2: { fields: [dim1, dim2, dim3] ,
 *                                        data: [[data3], ...]
 *                                        timestamp: timestamp } }
 * @param {Array} dimensionFilters - Values of dimensions to return metrics for
 * @returns {object} - { nodeName: { fields: [dim1, dim2] ,
 *                                   data: [[data1], [data2]],
 *                                   timestamp: timestamp } }
 */
function getDimensionData (metricData, dimensionFilters) {
  for (var nodeName in metricData) {
    if (nodeName === '' || typeof metricData[nodeName] === 'undefined') {
      console.error(`Undefined data:\n
              ${metricData[nodeName]}`);
      continue;
    }
    var dimensionData = metricData[nodeName].data.filter(data => dimensionFilters.includes(data[0]));
    metricData[nodeName].data = dimensionData;
  }
  return metricData;
}

/**
 * Given a hashmap of dimensions and data per node
 * and a hashmap of a counter and a timestamp of the latest data per node,
 * remove in-place the any data that has not been updated for 3 iterations.
 *
 * @param {object} metricData - hashmap object in the format of
 *                              { nodeName1: { fields: [dim1, dim2, dim3] ,
 *                                        data: [[data1], [data2]],
 *                                        timestamp: timestamp }
 *                                nodeName2: { fields: [dim1, dim2, dim3] ,
 *                                        data: [[data3], ...]
 *                                        timestamp: timestamp } }
 * @param {Array} dataTimestamp - hashmap object in the format of
 *                              { nodeName1: { counter: 0,
 *                                        timestamp: timestamp }
 *                                nodeName2: { counter: 1,
 *                                        timestamp: timestamp } }
 */
function removeStaleData(metricData, dataTimestamp) {
  for (var nodeName in metricData) {
    // Initialize or update `dataTimestamp`
    if (nodeName in dataTimestamp) {
      if (metricData[nodeName].timestamp > dataTimestamp[nodeName].timestamp) {
        dataTimestamp[nodeName] = { counter: 0, timestamp: metricData[nodeName].timestamp};
      } else {
        dataTimestamp[nodeName].counter++;
      }
    } else {
      dataTimestamp[nodeName] = { counter: 0, timestamp: metricData[nodeName].timestamp};
    }
    // Remove data that has not been updated for 3 iterations
    if (dataTimestamp[nodeName].counter >= 3) {
      console.error(`Data for node '${nodeName}' has not been updated for ` +
        `${dataTimestamp[nodeName].counter} iterations.` +
        ` Last updated timestamp was ${dataTimestamp[nodeName].timestamp}.` +
        ` Removing the data from the dashboard.`);
      delete metricData[nodeName];
    }
  }
}

module.exports.getMetricData = getMetricData;
module.exports.getMetricUnits = getMetricUnits;
module.exports.getNodeData = getNodeData;
module.exports.getDimensionData = getDimensionData;
module.exports.aggregateMetricData = aggregateMetricData;
module.exports.removeStaleData = removeStaleData;
module.exports.sortDataByDecreasingOrder = sortDataByDecreasingOrder;
module.exports.addCommaDelimiter = addCommaDelimiter;
