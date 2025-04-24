const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const createError = require('http-errors');
const http = require('http');
const { Server } = require('socket.io');

 
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const todoRouter = require('./routes/todo');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set('io', io);

 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

 
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'mysecret',
  resave: false,
  saveUninitialized: true
}));

 
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

 
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/todo', todoRouter);

 
app.use((req, res, next) => next(createError(404)));
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

 
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
