# PerfTop Design Doc

## Overview

<img src="../images/ArchitectureDiagram.png" alt="term" width="700" align="middle">

PerfTop CLI is a front-end visualization tool for the Performance Analyzer plugin (PA) so that users can conveniently monitor Elasticsearch cluster performance in real-time.

Its workflow entails each widget (1) making a GET request to the PA's REST API, (2) parsing the response, and (3) plotting the data.

## Why Node.js?

Two options were considered — Python and Node.js. Both languages are well-supported and popular and have many lightweight data plotting libraries available (e.g. matplotlib for Python and blessed-contrib for Node.js).

There were 2 major factors to consider:

1. Data fetching, parsing, and plotting needs to be synchronous.
    1. Python has an advantage in making synchronous I/O calls.
    2. Node.js can support the synchronous behavior with callbacks, but callbacks make error handling and debugging more difficult.
2. Each widget needs to be handled asynchronously so that the dashboard is as real-time and independent as possible.
    1. Supporting this in Python requires multi-process/thread (non-blocking) programming, each process/thread per widget. This makes the code much more complex.
    2. It is simple and easy to handle each dashboard component asynchronously in Node.js.

Both languages were great candidates but Node.js was a win, because it is able to support both #1 and #2 and the drawbacks of callbacks are not major in the PerfTop's workflow architecture.

## Data Fetch / Parse

PerfTop makes a HTTP request to the PA's Reader to fetch the metric data (`GET /_opendistro/_performanceanalyzer/metrics?metrics=${metrics}&agg=${aggregation}&dim=${dimensions}&nodes=all`). Note that by default it queries for `nodes=all`.

The returned response is in the format of:

```
{ nodeName1: { "timestamp": timestamp,
               "data":
                    {"fields": [{
                        "name": dim_type1,
                        "type": type },
                                {
                        "name": dim_type2,
                        "type": type }],
                    "records": [ data1, data2, ... ] },
  nodeName2: { "timestamp": timestamp,
               "data":
                    {"fields": [{
                        "name": dim_type1,
                        "type": type },
                                {
                        "name": dim_type2,
                        "type": type }],
                    "records": [ data1, data2, ... ] } }
```

We parse this into such data structure to make data plotting easier:

```
{ nodeName1: { fields: [dim_type1, dim_type2],
               data: [ [data1], [data2], ... ],
               timestamp: timestamp },
  nodeName2: { fields: [dim_type1, dim_type2],
               data: [ [data1], [data2], ... ],
               timestamp: timestamp } }
```

We cache the latest timestamp received for each node to determine if the data is stale or not. Because we don't want users to lose the data from the dashboard entirely when PA fails to update the metric data, we retry up to 3 iterations before removing it.

## Widgets and Usages

The first version of the PerfTop CLI includes tables, bar graphs, and line graphs as they are the most basic form of data representations. Each widget displays data on metric-level, dimension-level, and node-level so users can utilize the widget types according to their needs.

In this section, dimension type refers to the dim parameter passed into the `GET` request (e.g. Operation, IndexName, ShardID). A dimension type returns a set of dimension values. For example, dimension type “Operation” returns dimension values like “shardbulk”, “GC”, “merge”, “refresh”, etc.

### Table

Table is a metric-level widget and has the most flexibility, meaning that the users can query for as many metric/dimensions as they wish. Each column represents a metric/dimension/node name and each row represents the data returned from the PA. Users can also define a column to sort by (in a decreasing order).

PerfTop also makes a one-time `GET /_opendistro/_performanceanalyzer/metrics/units` request to fetch the units for all metrics. Tables then display these in the column headers.

### Bar

Bar graphs show data on dimension-level. The data will be summed across all nodes (cluster-wide) by default, unless the user specifies the “nodeName” field in the configuration to show data for a single node. Each bar represents a dimension value and its associated metric value. User must query for one metric that returns a numeric value and one dimension type.

### Line

Line graph widget shows metrics on node-level, each line representing a Elasticsearch cluster node. Because the number of nodes is arbitrary, the colors are randomized by default unless the user specifies the set of colors in the configuration.

### Global options

To allow more flexibility in the data visualization, we have extended few user-configurable options below:

* `nodeName` — the name of the ES cluster node for PerfTop to do a “startsWith” check during data parsing. This allows cluster-wide tables and bar graphs to be node-specific.
* `dimensionFilters` — users can define which dimension values to fetch for.

## Error Handling

Widgets are generated asynchronously. In case of any exceptions while generating a widget, we want to fail silently so that other widgets are not interfered and users don't lose the entire dashboard.

Handled cases:

* If a query parameter is invalid, make the widget blank.
* If PA returns an non-parseable response format, make the widget blank.
* If PA has issues and returns stale data, retry up to 3 iterations and remove the data from the dashboard afterwards.

### Logging

PerfTop incorporates the simplest way of logging — sending exception messages to STDERR and allowing users to define a logfile to direct the STDERR to. Because PerfTop is not a program that runs in a background or a system application, it doesn't make sense to have a separate mechanism for logging and rotating or cleaning up the generated log files. The workflow of PerfTop is simple and the set of errors isn't very extensive, so we let users to have an option to log for debugging purposes.

## Dashboard Configuration

Users are able to configure the PerfTop dashboards via a JSON file. They can specify widget types, query parameters (e.g. Elasticsearch cluster endpoint and what metrics to query for.), and visualization options (e.g. colors, widget positions, etc.).

Example JSON format:

```
{
    "endpoint": "",
    "graphs": {
        "tables": [
            {
                "queryParams": {
                    "metrics": "metric1,metrci2,...",
                    "aggregates": "max,sum,...",
                    "dimensions": "dim1,dim2,..."
                },
                "options": {
                    "gridPosition": {...},
                    "label": "widget title",
                    "refreshInterval": 5000
                }
            },
            {...}
        ],
        "bars": [
            {...}
        ],
        "lines": [
            {...}
        ]
    }
}
```

We allow global fields like endpoint, log file path, and json file path to be defined via a command line argument for convenience.

Because the first version of PerfTop is a simple, lightweight, and standalone CLI tool on the terminal, other interactive/visual tools for the dashboard configuration are not included.

## Packaging

PerfTop is packaged into ready-to-use, convenient executable file for Linux and MacOS. This will eliminate the trouble of users having to install Node.js or having version conflicts incompatibilities.

Windows OS is not supported due to ASCII generation incompatibilities from the package dependencies and Window's Command Prompt application.
