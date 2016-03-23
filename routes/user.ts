import express = require("express");
import db = require("../db");

const router = express.Router();

const notEmpty = function(str: string): boolean {
    return str != null && str.length > 0;
}

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

    if (notEmpty(user.hashedPassword) && (notEmpty(user.userName) || notEmpty(user.email))) {
        db.addUser(user).then((user) => {
            res.send(user);
        }, (user) => {
            res.send(user);
        });
    } else {
        res.status(409).send("");
    }


});

export = router;