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

var http = require('http');
var https = require('https');
var url = require('url');

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

  var urlOptions = getURLOptions(endpoint, `/_opendistro/_performanceanalyzer/metrics?${metricParam}${aggParam}${dimParam}&nodes=all`);

  makeRequest(urlOptions, function (response) {
    if (response === '') {
      done({});
    } else {
      done(getDataPerNode(response));
    }
  });
}

/**
 * Makes a HTTP(S) request to "{endpoint}/_opendistro/_performanceanalyzer/rca?${nameParam}${localParam}"
 * and parses the response to a hashmap object.
 *
 * @param {string} endpoint - endpoint for the metric query.
 * @param {string} name - name of the parameter, default as AllTemperatureDimensions
 * @param {boolean} local - running analysis in local
 * @param {string} dimension - dimension of RCA to be analyzed
 * @param {string} graphParams - the parameter to be rendered in the graph 
 * @param {string} type - the type of the graph
 * @param {function(object):void} done - callback to be called when the response is parsed into a hashmap object.
 */
function getMetricDataRCA(endpoint, name, local, dimension, graphParams, type, done) {
  var nameParam = name ? `name=${name}` : "name=AllTemperatureDimensions";
  var localParam = local ? `&local=${local}` : "&local=true";
  var urlOptions = getURLOptions(
    endpoint,
    `/_opendistro/_performanceanalyzer/rca?${nameParam}${localParam}`
  );
  makeRequest(urlOptions, function (response) {
    if (response === "") {
      console.error("empty response from server");
      done({});
    } else {
      done(getDataRCA(response, dimension, graphParams, type));
    }
  });
}

/**
 * Gets a URL option with host, port (default = 80), and path for http(s).request().
 *
 * @param {string} endpoint - endpoint for the query.
 * @param {string} path - metric query request path.
 */
function getURLOptions (endpoint, path) {
  endpoint = ( endpoint.startsWith('http://') || endpoint.startsWith('https://') ) ? endpoint : 'http://' + endpoint;
  var parsedURL = url.parse(url.resolve(endpoint, path));
  return {
    protocol: parsedURL.protocol,
    host: parsedURL.hostname,
    auth: parsedURL.auth,
    port: (parsedURL.port === null) ? (parsedURL.protocol === 'https:' ? 443 : 80 ): parsedURL.port,
    path: parsedURL.path
  };
}

/**
 * Makes a HTTP(S) request and returns the response.
 *
 * @param {string} urlOptions - URL option for the HTTP(S) request.
 * @param {string} done - callback for the HTTP(S) response.
 */
function makeRequest (urlOptions, done) {
  var rawData = '';
  var respond = function (response) {
    response.on('data', function (chunk) {
      rawData += chunk;
    });
    response.on('end', function () {
      done(rawData);
    });
  };
  var client = http;
  if (urlOptions.protocol == "https:") {
    client = https;
    urlOptions.rejectUnauthorized = false;
  }
  var req = client.request(urlOptions, respond);
  req.on('error', function (error) {
    console.error(error);
    done('');
  });
  req.end();
}

/**
 * Makes a HTTP(S) request to "{endpoint}/_opendistro/_performanceanalyzer/metrics/units"
 * and parses the response to a hashmap object.
 *
 * @param {string} endpoint - endpoint for the query.
 * @param {string} done - callback for the HTTP(S) response.
 */
function getMetricUnits (endpoint, done) {
  var urlOptions = getURLOptions(endpoint, '/_opendistro/_performanceanalyzer/metrics/units');
  makeRequest(urlOptions, function (response) {
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
 * Convert and parse a string to a number.
 *
 * @param {string} data - string
 * @returns {number|string} - if `data` cannot be converted to a number, return `data` back,
 *                            else return the number (with maximum of 2 decimal points if less than 100,
 *                            else a rounded integer).
 */
function parseNumberData (data) {
  if (data === null) {
    return 'null';
  } else if (data === '') {
    return data;
  }
  var parsedData = Math.round(data * 100) / 100;
  if (isNaN(parsedData)) {
    return data;
  } else if (parsedData < 100) {
    return parsedData;
  } else {
    return Math.round(parsedData);
  }
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
      nodeData.push(record.map(parseNumberData));
    });

    allData[nodeName] = { fields: nodeDimensions, data: nodeData, timestamp: jsonData[nodeName].timestamp };
  }
  return allData;
}

/**
 * Given a string HTTP(S) response, parse and return the data into a hashmap, replugable TODO: support HighHeapUsageClusterRca
 *
 * @param {object} rawData - string response from the HTTP(S) request that can be parsed into a JSON object.
 * @param {string} dimension - dimension to be analyzed
 * @param {string} graphParams - graph parameter to be plotted
 * @param {string} type - graph type
 * @returns {object} - returns a hashmap in the format of
 *                      { fields: [dim1, dim2, ...] ,
 *                        data: [ data1, data2, ...],
 *                        timestamp: timestamp
 *                      }
 */
function getDataRCA(rawData, dimension, graphParams, type) {
  var jsonData = {};
  try {
    jsonData = JSON.parse(rawData).AllTemperatureDimensions[0].NodeLevelDimensionalSummary;
    if (jsonData.length === 0 || jsonData === undefined) {
      console.error(`Failed to retrieve data for metrics. HTTP(S) response was:
        ${rawData}`);
      return {};
    }
    if (graphParams.split(",").length > 1) {
      console.error(`Too many graph parameters to plot`);
      return {};
    }
  } catch (e) {
    console.error(`HTTP(S) Response for per-node data was not in JSON format:
      ${rawData}`);
    return {};
  }

  var nodeDimensions = [];
  var nodeData = [];
  var nodeTimestamp;
  var allData = {};
  for (var i = 0; i < jsonData.length; i++) {
    var node = jsonData[i];
    if (!("dimension" in node)) {
      console.error(`Data returned was in an unexpected format:
        ${JSON.stringify(node)}`);
      continue;
    }
    if (!dimension.includes(node.dimension)) continue;
    nodeTimestamp = node.timestamp;
    var zoneSummary = node.NodeLevelZoneSummary;
    
    if (type === "lines") {
      var field = node.dimension + " - " + graphParams;
      nodeDimensions.push(field);

      if (node.hasOwnProperty(graphParams)) {
        nodeData.push(parseNumberData(node[graphParams]));
      } else {
        nodeData.push("null");
      }
    } else if (type === "tables") {
      for (var j = 0; j < zoneSummary.length; j++) {
        if (zoneSummary[j].zone === graphParams) {
          var target = zoneSummary[j];
          if (target.all_shards.length > 0) {
            nodeDimensions.push('index_name');
            nodeDimensions.push("shard_id");
            target.all_shards[0].temperature.forEach(function (field) {
              nodeDimensions.push(field.dimension);
            });
            for (var k = 0; k < target.all_shards.length; k++) {
              var tmp = target.all_shards[k];
              var tmpData = [];
              tmpData.push(tmp.index_name);
              tmpData.push(tmp.shard_id);
              tmp.temperature.forEach(function (data) {
                tmpData.push(parseNumberData(data.value));
              });
              nodeData.push(tmpData);
            }
          }
          break;
        }
      }
    } else if (type == "donuts") {
      for (var j = 0; j < zoneSummary.length; j++) {
        nodeDimensions.push(zoneSummary[j].zone);
        nodeData.push(parseNumberData(zoneSummary[j].all_shards.length));
      }
    }
    break;
  }
  try {
    allData = {
      fields: nodeDimensions,
      data: nodeData,
      timestamp: nodeTimestamp,
    };
  } catch (e) {
    console.error(`error find: ${e}`);
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

/**
 * Given a hashmap of dimensions and data,
 * and an object containing a hashmap of a counter and a timestamp of each field,
 * remove in-place the any data that has not been updated for 3 iterations.
 *
 * @param {object} metricData - hashmap object in the format of
 *                             { fields: [dim1, dim2, ...] ,
 *                             data: [ data1, data2, ...],
 *                             timestamp: timestamp}
 * @param {object} metricGraph - Object contains a hashmap object in the format of
 *                              { field1: { counter: 0,
 *                                        timestamp: timestamp }
 *                                field2: { counter: 1,
 *                                        timestamp: timestamp } }
 */
function removeStaleDataRCA(metricData, metricGraph) {
  var dataTimestamp = metricGraph.dataTimestamp;
  var field = metricGraph.dimension + " - " + metricGraph.graphParams;
  if (field in dataTimestamp) {
    if (metricData.timestamp > dataTimestamp[field].timestamp) {
      dataTimestamp[field] = { counter: 0, timestamp: metricData.timestamp };
    } else {
      dataTimestamp[field].counter++;
    }
  } else {
    dataTimestamp[field] = { counter: 0, timestamp: metricData.timestamp };
  }

  /* uncomment this chunk of code when the response becomes dynamic
  if (dataTimestamp[field].counter >= 3) { 
    console.error(`Data ${fields} has not been updated for ` +
      `${dataTimestamp[field].counter} iterations.` +
      ` Last updated timestamp was ${dataTimestamp[field].timestamp}.` +
      ` Removing the data from the dashboard.`);
    delete metricData;
  }
  */
}

module.exports.getMetricData = getMetricData;
module.exports.getMetricUnits = getMetricUnits;
module.exports.getNodeData = getNodeData;
module.exports.getDimensionData = getDimensionData;
module.exports.aggregateMetricData = aggregateMetricData;
module.exports.parseNumberData = parseNumberData;
module.exports.removeStaleData = removeStaleData;
module.exports.sortDataByDecreasingOrder = sortDataByDecreasingOrder;
module.exports.addCommaDelimiter = addCommaDelimiter;
module.exports.getMetricDataRCA = getMetricDataRCA;
module.exports.removeStaleDataRCA = removeStaleDataRCA;
