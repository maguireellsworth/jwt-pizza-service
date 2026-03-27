const config = require('./config');

class Logger {
  httpLogger = (req, res, next) => {
    const originalSend = res.send.bind(res);

    res.send = (body) => {
      try {
        const logData = {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          authorized: !!req.headers.authorization,
          reqBody: this.safeSerialize(this.redact(req.body)),
          resBody: this.safeSerialize(this.redact(this.tryParse(body))),
        };

        const level = this.statusToLogLevel(res.statusCode);
        this.log(level, 'http', logData);
      } catch (err) {
        console.log('Failed to build HTTP log', err);
      }

      return originalSend(body);
    };

    next();
  };

  log(level, type, logData) {
    try {
      const labels = {
        component: config.logging.source,
        level,
        type,
      };

      const values = [[this.nowString(), this.safeSerialize(logData)]];
      const logEvent = {
        streams: [{ stream: labels, values }],
      };

      this.sendLogToGrafana(logEvent);
    } catch (err) {
      console.log('Failed to send log payload', err);
    }
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  nowString() {
    return (Date.now() * 1000000).toString();
  }

  safeSerialize(value) {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      return '"[unserializable]"';
    }
  }

  tryParse(value) {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  redact(value) {
    if (value === null || value === undefined) return value;

    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item));
    }

    if (typeof value === 'object') {
      const copy = {};
      for (const [key, val] of Object.entries(value)) {
        if (key.toLowerCase().includes('password')) {
          copy[key] = '*****';
        } else if (key.toLowerCase().includes('token') || key.toLowerCase() === 'authorization' || key.toLowerCase() === 'jwt') {
          copy[key] = '*****';
        } else {
          copy[key] = this.redact(val);
        }
      }
      return copy;
    }

    return value;
  }

  sendLogToGrafana(event) {
    const body = JSON.stringify(event);

    fetch(config.logging.endpointUrl, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logging.accountId}:${config.logging.apiKey}`,
      },
    }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.log('Failed to send log to Grafana');
        console.log("reason: ", res.status, text)
      }
    }).catch((err) => {
      console.log('Error sending log to Grafana', err);
    });
  }
}

module.exports = new Logger();