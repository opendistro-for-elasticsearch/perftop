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
./perf-top-${PLATFORM} --dashboard $JSON --endpoint $ENDPOINT
```
`--dashboard` argument can be passed in as the relative path to the JSON configuration file.
For preset dashboards, it can also be passed in as `ClusterOverview`, `ClusterPerformanceDiagnostic`,
`ClusterPerformanceInformational`, or `NodeAnalysis` instead of the JSON file path (e.g. `--dashboard ClusterOverview`). For what each dashboard entails, refer to [Preset Dashboards](##preset-dashboards).

From a cluster node with Performance Analyzer REST API on port 9600, set your `ENDPOINT` to `localhost:9600`.

For stderr logging, add `--logfile $logfile`.

For the preset `dashboards/NodeAnalysisDashboard.json`, pass in `--nodename $NODENAME` to configure your dashboard
to fetch metrics for a single node.

### Without the Executables
Refer to [Development section](##configuration###build).

## Preset Dashboards

### ClusterOverview
- Resource Metrics
  - Sorted by `CPU_Utilization` in decreasing order
- Workload
  - Metrics on `bulk` and `search` operations
- Elasticsearch Operation CPU (cores) per Node
  - Aggregaed value of `CPU_Utilization` metric on per-node level
- Write Throughput (Bps) per Operation
  - Aggregated `IO_WriteThroughput` metric on cluster-wide level
- CPU (cores) per Operation
  - Aggregaed value of `CPU_Utilization` metric on cluster-wide level

### ClusterPerformanceDiagnostic
- Average Disk Wait Time
- Average Disk Service Rate
- Maximum Heap usage of Old GC
- Maximum Heap usage of Young GC
- Packet Drop Rate (IPv4)
- Packet Drop Rate (IPv6)
- Circuit Breaker - Estimated and Configured Limits
  - Sorted by `CB_EstimatedSize` in decreasing order
- Circuit Breaker - Tripped Events (count)
  - Number of `tripped` circuit breaker events on cluster-wide level
- Average Indexing Throttle Time
- Master Pending Tasks (count)
  - Number of pending tasks on per-node level

### ClusterPerformanceInformational
- Thread Pool
  - Sorted by `ThreadPool_RejectedReqs` in decreasing order
- Master Pending Tasks (count)
- Index Merge
  - Sorted by `Merge_Event` in decreasing order
- Index Flush
  - Sorted by `Flush_Event` in decreasing order
- Page Faults
  - Sorted by `Paging_MajfltRate` in decreasing order
- Circuit Breaker - Estimated and Configured Limits
  - Sorted by `CB_EstimatedSize` in decreasing order
- Circuit Breaker - Tripped (count)
  - Number of `tripped` circuit breaker events on cluster-wide level

### NodeAnalysis
- Supports `--nodename $NODENAME` argument for displaying metric data for ONLY the node that starts with `$NODENAME`.
- Shard Request Cache Hit and Miss
  - Sorted by `Cache_Request_Miss` in decreasing order
- IPv4 Packet Drop Rate (packets/s)
  - If node name is not given, this will show cluster-wide aggregation value
- IPv6 Packet Drop Rate (packets/s)
  - If node name is not given, this will show cluster-wide aggregation value
- Average Indexing Throttle Time
- Total GC Collection Events (count)
  - If node name is not given, this will show cluster-wide aggregation value
- Total GC Collection Time (ms)
  - If node name is not given, this will show cluster-wide aggregation value
- Garbage Collection CPU (cores)
  - If node name is not given, this will show per-node aggregation value
- Maxiumum Heap Usage of Old and Young GC
- Average Disk Wait Time
- Average Disk Service Rate

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
