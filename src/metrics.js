const config = require('./config')
const os = require('os');

class MetricsTracker {
  constructor(config, intervalMs = 10000) {
    this.config = config;
    this.intervalMs = intervalMs;
    this.serviceLatency = [];
    this.requests = { total: 0 };
    this.authentications = {
      'success': 0,
      'failure': 0,
    };
    this.orders = {
      'success': 0,
      'failure': 0,
    };
    this.timer = null;

    this.trackRequest = this.trackRequest.bind(this);
    this.trackServiceLatency = this.trackServiceLatency.bind(this);
  }

  trackRequest(req, res, next) {
    const method = req.method;
    this.requests[method] = (this.requests[method] || 0) + 1;
    this.requests.total += 1;
    next();
  }

  authFailure() {
    this.authentications['failure'] = (this.authentications['failure'] || 0) + 1;
  }

  authSuccess() {
    this.authentications['success'] = (this.authentications['success'] || 0) + 1;
  }

  orderSuccess() {
    this.orders['success'] = (this.orders['success'] || 0) + 1;
  }

  orderFailure() {
    this.orders['failure'] = (this.orders['failure'] || 0) + 1;
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  trackServiceLatency(req, res, next) {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;

      this.serviceLatency.push(durationMs);
    });

    next();
  }

  start() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.sendMetrics();
    }, this.intervalMs);
  }

  stop() {
    if (!this.timer) return;

    clearInterval(this.timer);
    this.timer = null;
  }

  async sendMetrics() {
    const metrics = [];

    Object.keys(this.requests).forEach((key) => {
      metrics.push(
        this.createMetric(
          'requests',
          this.requests[key],
          '1',
          'sum',
          'asInt',
          { method: key, source: this.config.metrics.source }
        )
      );
    });

    Object.keys(this.authentications).forEach((key) => {
      metrics.push(
        this.createMetric(
          'authentications',
          this.authentications[key],
          '1',
          'sum',
          'asInt',
          { method: key, source: this.config.metrics.source }
        )
      )
    })

    Object.keys(this.orders).forEach((key) => {
      metrics.push(
        this.createMetric(
          'pizza_creation',
          this.orders[key],
          '1',
          'sum',
          'asInt',
          { status: key, source: this.config.metrics.source }
        )
      )
    })

    metrics.push(
      this.createMetric(
        'cpu_usage',
        this.getCpuUsagePercentage(),
        '%',
        'gauge',
        'asDouble',
        { source: this.config.metrics.source }
      )
    );

    metrics.push(
      this.createMetric(
        'memory',
        this.getMemoryUsagePercentage(),
        '%',
        'gauge',
        'asDouble',
        { source: this.config.metrics.source }
      )
    );

    this.serviceLatency.forEach((time) => {
      metrics.push(
        this.createMetric(
          'serviceLatency',
          time,
          'ms',
          'gauge',
          'asDouble',
          { source: this.config.metrics.source }
        )
      )
    })
    this.serviceLatency = [];

    const body = {
      resourceMetrics: [
        {
          scopeMetrics: [
            {
              metrics,
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(this.config.metrics.endpointURL, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${this.config.metrics.accountId}:${this.config.metrics.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error pushing metrics:', error);
    }
  }

  createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
    const metric = {
      name: metricName,
      unit: metricUnit,
      [metricType]: {
        dataPoints: [
          {
            [valueType]: metricValue,
            timeUnixNano: Date.now() * 1000000,
            attributes: [],
          },
        ],
      },
    };

    Object.keys(attributes).forEach((key) => {
      metric[metricType].dataPoints[0].attributes.push({
        key,
        value: { stringValue: String(attributes[key]) },
      });
    });

    if (metricType === 'sum') {
      metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
      metric[metricType].isMonotonic = true;
    }

    return metric;
  }
}

// module.exports = MetricsTracker
const metrics = new MetricsTracker(config, 5000);
if(process.env.NODE_ENV !== 'test'){
  metrics.start();
}
module.exports = metrics