# ESTop in NodeJS

ESTop makes a HTTP request to  `<endpoint>/_performanceanalyzer/metrics`
and generates visualizations from the output.
Make sure your running environment has access to your endpoint.

## Requirements
### Development
- `node` (version >= v10.0 < v11.0)
- `npm`

## Download

Clone or download from Github.

## Usage
From Mac:
```
./es-top-macos --json dashboards/ClusterOverview.json --endpoint $SEARCH_ENDPOINT
```

To run this on a cluster node, scp `es-top-linux` and `dashboard/*` and the JSON config file to the node.
```
./es-top-linux --json dashboards/ClusterOverview.json --endpoint localhost:9600
```

For stderr logging, add `--logfile $logfile`.

For `dashboards/NodeAnalysisDashboard.json`, pass in `--nodename $nodename` to configure your dashboard
to fetch metrics for a single node.

## Development
1. `npm install` - locally installs dependencies
2. `npm run build` - creates "es-top-*" executables
3. `npm run clean` - deletes locally installed dependencies and executables


## Configuration (JSON)
### Required Fields
- `endpoint` - Define your search endpoint for your ES cluster
- `graphs` - for each `tables`, `bars`, and `lines`
  - `queryParams` - parameters for the HTTP request to fetch data from your endpoint
    - `metrics` - for bar and line graphs, query for ONE metric that would return a numeric value
    - `aggregates`
    - `dimensions`
    - `nodeName` - the NAME of the node. ES Top will do a "startswith" check on this.
    - `sortBy` - for tables only.
    - `dimensionFilters`
  - `gridOptions` - for auto-positioning the graphs. Define `rows` and `cols` with a numeric value. The `gridPosition` will base off on these values.
  - `options` - graph object options.
    - `gridPosition` defines the position of your graph.
    - `refreshInterval` - how frequently your graph will generate new data (in milliseconds).
    - Please refer to the [blessed lvibrary](https://github.com/chjj/blessed) and
[blessed-contrib library](https://github.com/yaronn/blessed-contrib) for the definition of options.
