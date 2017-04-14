const express = require('express');
const bodyParser = require('body-parser');
const {buildSchema} = require('graphql');
const {graphqlExpress, graphiqlExpress} = require('graphql-server-express');

const {initPassport} = require('./passport');
const session = require('express-session');
const executableSchema = require('./restaurant/rootSchema');
const {Users, Reservations} = require('./restaurant/models');

const {storage} = require('./restaurant/in-memory');


// TODO: Move config to external file
const configDefaults = {
  port: 4000,
  hostname: 'localhost',
  prodMode: false, 
  endpoints: {
    graphql: '/graphql',
    graphiql: '/graphiql'
  }
}


exports.run = (configOverride) => {

  const config = Object.assign({}, configDefaults, configOverride);

  // TODO: configure connector, planned variants - in memory, based on mongodb (or postgresql), on top of API 
  const connector = storage;
  // ----------  EXPRESS ----------


  const passport = initPassport(connector);
  const authenticationMiddleware = config.prodMode ? passport.authenticate('local') : (req, res, next) => next();
  const app = express();

  app.use(bodyParser.json()); 
  app.use(session({ cookie: { maxAge: 60000 }, 
                    secret: 'mySecretSaltForHash',
                    resave: false, 
                    saveUninitialized: false}));  
  
  app.use(require("connect-flash")());
  app.use(passport.initialize());
  app.use(passport.session());



  app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) { return next(err); }
      if (!user) { return   res.status(401).json({message:"Wrong Credentials"}); }
      req.logIn(user, (err) => {
        if (err) { return next(err); }
        return res.json({message:`Welcome ${user.login}!`});
      });
    })(req, res, next);
  });


  app.get('/logout', function(req, res){
    req.logout();
    res.json({message:'Logged out sucecssfully'});
  });



  app.use(config.endpoints.graphql, authenticationMiddleware, graphqlExpress(req => {

    // Get the query, the same way express-graphql does it
    const query = req.query.query || req.body.query;
    if (query && query.length > 2000) {
      // Probably someone trying to send an overly expensive query - noughty users!
      throw new Error('Query too large');
    }

    const options = {connector};

    return {
      schema: executableSchema,
      context: {
        currentUser: req.user,
        Users: new Users(options),
        Reservations: new Reservations(options)
      }
    }
  }));


  if (!config.prodMode) {
    app.use(config.endpoints.graphiql, passport.authenticate('basic'),  graphiqlExpress({endpointURL: config.endpoints.graphql}));
  }



  app.listen(config.port, config.hostname, () => {
    console.log(`Restaurant graphQL server is now running on http://${config.hostname}:${config.port}`);
  });

  return app;
}