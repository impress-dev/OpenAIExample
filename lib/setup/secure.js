const debug = require('debug')('server-connect:secure');
const config = require('./config');

module.exports = function (app) {
  if (config.passport) {
    const passport = require('passport');
    const ServerConnectStrategy = require('../auth/passport');

    passport.use(new ServerConnectStrategy({ provider: 'security' }));

    app.use(passport.initialize());
    app.use(passport.session());
    app.use(passport.authenticate('server-connect'));

    debug('Passport initialized', passport.strategies);
    
    app.use((req, res, next) => {
      debug('auth', req.isAuthenticated());
      debug('Session', req.session);
      if (req.user) {
        debug('User', req.user);
      }
      next();
    });

    app.use('/api/secure', restrict());
  }
};

// restrict middleware
function restrict (options = {}) {
  return async function (req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }

    if (req.is('json')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (options.redirect) {
      return res.redirect(options.redirect);
    }

    res.status(401).send('Unauthorized');
  };
}