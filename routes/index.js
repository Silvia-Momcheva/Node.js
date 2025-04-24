var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express 123' });
});

module.exports = router;
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Примерна проверка (трябва да я замениш с реална от БД)
  if (username === "demo" && password === "demo") {
    req.session.user = username;
    res.redirect("/todo"); // или "/"
  } else {
    res.render("login", { warn: "Invalid credentials" });
  }
});
