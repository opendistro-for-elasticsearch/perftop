# PerfTop in NodeJS

PerfTop makes a HTTP request to  `<endpoint>/_performanceanalyzer/metrics`
and generates visualizations from the output.
Make sure your running environment has access to your endpoint.

Documentation: [LINK]

## Download

Download the executables and preset JSON dashboard configs from s3: [LINK]

Supported platforms: Linux, MacOS

## Demo Usage
### With Executables

```
./perf-top-${PLATFORM} --json $JSON --endpoint $ENDPOINT
```

From a cluster node with Performance Analyzer REST API on port 9600, set your `ENDPOINT` to `localhost:9600`.

For stderr logging, add `--logfile $logfile`.

For the preset `dashboards/NodeAnalysisDashboard.json`, pass in `--nodename $NODENAME` to configure your dashboard
to fetch metrics for a single node.

### Without the Executables
Refer to [Development section](### Build/Usage).

## Development
### Requirements
- `node` (version >= v10.0 < v11.0)
- `npm`

### Build/Usage
1. Clone/download from Github
2. Run `./gradlew build`. This will run the following:
   1. `npm install` - locally installs dependencies
   2. `npm run build` - creates "perf-top-*" executables
3. For cleaning, run `./gradlew clean` which will run:
   1. `npm run clean` - deletes locally installed dependencies and executables

To run PerfTop without (re)creating the executables every code change:
```
node ./bin.js --json $JSON --endpoint $ENDPOINT
```

## Configuration (JSON)
### Required Fields
- `endpoint` - Define the endpoint for PerfTop. This can be provided via command line argument.
- `graphs` - For each `tables`, `bars`, and `lines`
  - `queryParams` - Parameters for the HTTP request to fetch data from your endpoint
    - `metrics` - For bar and line graphs, query for ONE metric that would return a numeric value
    - `aggregates`
    - `dimensions`
    - `nodeName` - The name of the node. PerfTop will do a "startswith" check on this. This can be "#nodeName" and be replaced by the `--nodename $NODE_NAME` command line argument.
    - `sortBy` - In decreasing order. For tables only.
    - `dimensionFilters` - Array of dimension values to fetch for.
  - `gridOptions` - For auto-positioning the graphs. Define `rows` and `cols` with a numeric value. The `gridPosition` will base off on these values.
  - `options` - Graph object options.
    - `gridPosition` - Defines the position of your graph.
    - `refreshInterval` - How frequently your graph will generate new data (in milliseconds).
    - Please refer to the [blessed library](https://github.com/chjj/blessed) and
[blessed-contrib library](https://github.com/yaronn/blessed-contrib) for the definition of options.
