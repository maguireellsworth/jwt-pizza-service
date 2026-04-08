const express = require('express');
const { authRouter, setAuthUser } = require('./routes/authRouter.js');
const orderRouter = require('./routes/orderRouter.js');
const franchiseRouter = require('./routes/franchiseRouter.js');
const userRouter = require('./routes/userRouter.js');
const version = require('./version.json');
const config = require('./config.js');
const logger = require('./logger.js');
const MetricsTracker = require('./metrics.js');
// const metrics = new MetricsTracker(config, 10000);
// metrics.start();

const app = express();
app.use(express.json());
app.use(logger.httpLogger)
app.use(MetricsTracker.trackRequest)
app.use(setAuthUser);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
});

const apiRouter = express.Router();
app.use('/api', MetricsTracker.trackServiceLatency)
app.use('/api', apiRouter);

apiRouter.use('/auth', authRouter);
apiRouter.use('/user', userRouter);
apiRouter.use('/order', orderRouter);
apiRouter.use('/franchise', franchiseRouter);

apiRouter.use('/docs', (req, res) => {
  res.json({
    version: version.version,
    endpoints: [...authRouter.docs, ...userRouter.docs, ...orderRouter.docs, ...franchiseRouter.docs],
    config: { factory: config.factory.url, db: config.db.connection.host },
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'welcome to JWT Pizza',
    version: version.version,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'unknown endpoint',
  });
});

// Default error handler for all exceptions and errors.
app.use((err, req, res, next) => {
  const statusCode = err.statusCode ?? 500;
  const safeReqBody = {...req.body};
  if(safeReqBody.password){
    safeReqBody.password = '*****';
  }
  logger.log(statusCode >= 500 ? 'error' : 'warn', 'error', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    authorized: !!req.headers.authorization,
    message: err.message,
    stack: err.stack,
    reqBody: JSON.stringify(safeReqBody),
  })

  res.status(err.statusCode ?? 500).json({ message: err.message, stack: err.stack });
  next();
});

module.exports = app;
