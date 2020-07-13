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

var blessed = require('blessed');

/**
 * Creates a new metricGraph that has a shared screen for all metricTable, metricBar, and metricLine objects.
 *
 * @class
 */
function metricGraphs () {
  this.screen = blessed.screen();
  this.screen.key(['escape', 'q', 'C-c'], function () {
    return process.exit(0);
  });
  this.allGraphs = [];
  this.metricUnits = {};
}

/**
 * Adjust the graphs if screen resizes
 */
metricGraphs.prototype.resizeGraphsToScreen = function () {
  // Adjust the graphs if screen resizes
  var graphs = this.allGraphs;
  var graphScreen = this.screen;
  this.screen.on('resize', function () {
    for (var i = 0; i < graphs.length; i++) {
      graphs[i].emit();
    }
    graphScreen.render();
  });
};

/**
 * Generate the graphs and update the graphs every refreshInterval milliseconds.
 */
metricGraphs.prototype.start = function () {
  for (var graph in this.allGraphs) {
    var metricGraph = this.allGraphs[graph];
    metricGraph.generateGraph(metricGraph, this.screen);
    setInterval(metricGraph.generateGraph, metricGraph.refreshInterval, metricGraph, this.screen);
  }
};

module.exports.metricGraphs = metricGraphs;
