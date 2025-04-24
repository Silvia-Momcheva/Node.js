const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const session = require("express-session");
const sqlite3 = require("sqlite3");
const fileUpload = require("express-fileupload");
const bcrypt = require("bcryptjs");
const users = require("./passwd.json");

router.use(
  session({
    secret: "random string",
    resave: true,
    saveUninitialized: true,
  })
);

router.use(fileUpload());

const db = new sqlite3.Database("todo.sqlitedb");
db.serialize();
db.run(`CREATE TABLE IF NOT EXISTS todo(
    id INTEGER PRIMARY KEY,
    user TEXT NOT NULL,
    task TEXT,
    url TEXT,
    date_created TEXT,
    date_modified TEXT
)`);
db.parallelize();

router.get("/login", (req, res) => {
  res.render("login", { info: "PLEASE LOGIN" });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  bcrypt.compare(password, users[username] || "", (err, isMatch) => {
    if (err) throw err;
    if (isMatch) {
      req.session.username = username;
      req.session.count = 0;
      res.redirect("/todo/");
    } else {
      res.render("login", { warn: "TRY AGAIN" });
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/todo/");
});

router.all("*", (req, res, next) => {
  if (!req.session.username && req.url !== "/login") {
    return res.redirect("/todo/login");
  }
  next();
});

router.get("/", (req, res) => {
  req.session.count++;
  const info = `User: ${req.session.username} | Count: ${
    req.session.count
  } | ${new Date().toLocaleString()}`;
  const search = req.query.search || "";

  let sql = "SELECT * FROM todo";
  let params = [];

  if (search.trim() !== "") {
    sql += " WHERE task LIKE ?";
    params.push(`%${search}%`);
  }

  sql += " ORDER BY date_modified DESC";

  db.all(sql, params, (err, rows) => {
    if (err) throw err;
    res.render("todo", {
      info,
      rows,
      user: req.session.username,
      searchQuery: search || "",
    });
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/todo/");
    }
    res.redirect("/todo/");
  });
});

router.post("/upload", (req, res) => {
  if (!req.session.username) {
    return res.redirect("/todo/login");
  }

  let url = "";
  if (req.files && req.files.file) {
    const file = req.files.file;
    const filename = Date.now() + "_" + file.name;
    const filepath = path.join(__dirname, "../public/images", filename);
    file.mv(filepath, (err) => {
      if (err) throw err;
    });
    url = "/images/" + filename;
  }

  db.run(
    `
        INSERT INTO todo(user, task, url, date_created, date_modified)
        VALUES (?, ?, ?, DATETIME('now','localtime'), DATETIME('now','localtime'))
    `,
    [req.session.username, req.body.task || "", url],
    (err) => {
      if (err) throw err;
      res.redirect("/todo/");
    }
  );
});

router.post("/delete", (req, res) => {
  const postId = req.body.id;
  const username = req.session.username;

  db.get("SELECT user FROM todo WHERE id = ?", [postId], (err, row) => {
    if (err) throw err;
    if (!row) return res.send("Post not found.");
    if (row.user !== username) return res.send("Unauthorized.");

    db.run("DELETE FROM todo WHERE id = ?", [postId], (err) => {
      if (err) throw err;
      res.redirect("/todo/");
    });
  });
});

router.post("/update", (req, res) => {
  const { id, task, url: oldUrl } = req.body;
  const username = req.session.username;

  let url = oldUrl;

  if (req.files && req.files.file) {
    const file = req.files.file;
    const filename = Date.now() + "_" + file.name;
    const filepath = path.join(__dirname, "../public/images", filename);
    file.mv(filepath, (err) => {
      if (err) throw err;
    });
    url = "/images/" + filename;
  }

  db.get("SELECT user FROM todo WHERE id = ?", [id], (err, row) => {
    if (err) throw err;
    if (!row) return res.send("Post not found.");
    if (row.user !== username) return res.send("Unauthorized.");

    db.run(
      `
            UPDATE todo
            SET task = ?,
                url = ?,
                date_modified = DATETIME('now','localtime')
            WHERE id = ?
        `,
      [task, url, id],
      (err) => {
        if (err) throw err;
        res.redirect("/todo/");
      }
    );
  });
});

router.all("*", (req, res) => {
  res.send("No such page or action! Go to: <a href='/todo/'>main page</a>");
});

module.exports = router;
