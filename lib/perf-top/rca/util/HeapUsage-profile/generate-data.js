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

var helper = require('../../../helper.js');

/**
 * Makes a HTTP(S) request to "{endpoint}/_opendistro/_performanceanalyzer/rca?${nameParam}${localParam}"
 * and parses the response to a hashmap object.
 *
 * @param {string} endpoint - endpoint for the metric query.
 * @param {string} name - name of the parameter, default as AllTemperatureDimensions
 * @param {string} local - running analysis in local
 * @param {string} dimension - dimension of RCA to be analyzed
 * @param {string} graphParams - the parameter to be rendered in the graph
 * @param {string} type - the type of the graph
 * @param {function(object):void} done - callback to be called when the response is parsed into a hashmap object.
 */
function getMetricData(endpoint, name, local, dimension, graphParams, type, done) {
    var nameParam = name ? `name=${name}` : "name=HighHeapUsageClusterRca";
    var localParam = local != null ? `&local=${local}` : "";
    var urlOptions = helper.getURLOptions(
        endpoint,
        `/_opendistro/_performanceanalyzer/rca?${nameParam}${localParam}`
    );
    dimension = "HighHeapUsageClusterRca";

    helper.makeRequest(urlOptions, function (response) {
        if (response === "") {
            console.log("empty response from server");
            console.error("empty response from server");
            done({});
        } else {
            done(getData(response, dimension, graphParams, type));
        }
    });
}

/**
 * Given a string HTTP(S) response, parse and return the data into a hashmap.
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
function getData(rawData, dimension, graphParams, type) {
    var jsonData = {};
    try {
        jsonData = JSON.parse(rawData).HighHeapUsageClusterRca[0];
        if (jsonData.length === 0) {
            console.log(`Failed to retrieve data for metrics. HTTP(S) response was:
        ${rawData}`);
            return {};
        }
        if (graphParams.split(",").length > 1) {
            console.log(`Too many graph parameters to plot`);
            return {};
        }
        if(jsonData.HotClusterSummary === undefined){
            console.log(`the state of heap usage is healthy`);
        }
    } catch (e) {
        console.error(`HTTP(S) Response for per-node data was not in JSON format:
      ${rawData}`);
        return {};
    }


    var nodeTimestamp = jsonData.timestamp;
    var clusterSummary;
    var nodeSummary;
    var resourceSummary;
    try{
        clusterSummary = jsonData.HotClusterSummary;
        nodeSummary = clusterSummary.HotNodeSummary;
        resourceSummary = nodeSummary.HotResourceSummary;
    }
    var nodeDimensions = [];
    var nodeData = [];
    var allData = {};

    if(type === "lines"){
        var field = dimension + "-" + graphParams;
        nodeDimensions.push(field);
        if(resourceSummary.hasOwnProperty(graphParams)){
            nodeData.push(helper.parseNumberData(resourceSummary[graphParams]));
        }else{
            nodeData.push("null");
        }
    }else if(type === 'donuts'){
        var unhealthyNodes = clusterSummary.number_of_unhealthy_nodes;
        var healthyNodes = clusterSummary.number_of_nodes - unhealthyNodes;
        nodeDimensions.push("healthy_node");
        nodeData.push(healthyNodes);
        nodeDimensions.push("unhealthy_nodes");
        nodeData.push(unhealthyNodes);
    }else if(type === 'tables'){
        if(graphParams === 'TopConsumerSummary'){
            resourceSummary.TopConsumerSummary.forEach(function(field){
                nodeDimensions.push(field.name);
                nodeData.push(field.value);
            })
        }else if(graphParams === 'generalSummary'){
            nodeDimensions.push['rca_name,node_id,host_address,resource_type,resource_metric,threshold,value'];
            var rcaName = jsonData.rca_name;
            var nodeId = nodeDimensions.node_id;
            var hostAddress = nodeDimensions.host_address;
            var resourceType = resourceSummary.resource_type;
            var resourceMetric = resourceSummary.resource_metric;
            var threshold = resourceSummary.threshold;
            var value = resourceSummary.value;
            nodeData.push[rcaName, nodeId, hostAddress, resourceType, resourceMetric, threshold, value];
        }
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
function removeStaleData(metricData, metricGraph) {
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
module.exports.removeStaleData = removeStaleData;
