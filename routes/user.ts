import express = require("express");
import db = require("../db");

const router = express.Router();

router.get('/', function(req, res, next) {
    db.getUsers(null).then((users) => {
        res.send(users);
    }, (err) => {
        res.send(err);
    });
});

router.post('/', function(req, res, next) {
    const user = {
        userName: req.body.userName,
        hashedPassword: req.body.hashedPassword,
        email: req.body.email
    };

    db.addUser(user).then((user) => {
        res.send(user);
    }, (user) => {
        res.send(user);
    });
});

export = router;