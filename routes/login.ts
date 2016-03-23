import express = require("express");
import db = require("../db");

const router = express.Router();

const notEmpty = function(str: string): boolean {
    return str != null && str.length > 0;
}

router.get('/', (req, res) => {
    res.redirect("/");
});

//send cookie if password is correct, empty string otherwise.
router.post('/', (req, res) => {
    const user = {
        userName: req.body.userName,
        email: req.body.email,
        hashedPassword: req.body.hashedPassword
    }

    if (notEmpty(user.hashedPassword) && (notEmpty(user.userName || notEmpty(user.email)))) {
        db.varifyUser(user).then(
            (cookie) => (res.send(cookie)),
            (emptyString) => (res.send(400, emptyString)));
    }else{
        res.status(409).send("");
    }
});

export = router;