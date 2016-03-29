import express = require("express");
import db = require("../db");

const router = express.Router();

const notEmpty = function(str: string): boolean {
    return str != null && str.length > 0;
}

const isValidateId = function(id: string): boolean {
    return id != null && (12 === id.length || 24 === id.length);
}

router.get('/', function(req, res, next) {
    db.getUsers(null).then((users) => {
        res.send(users);
    }, (err) => {
        res.send(err);
    });
});

router.post('/', function(req, res, next) {
    const user: db.User = {
        userName: req.body.userName,
        hashedPassword: req.body.hashedPassword,
        email: req.body.email
    };

    if (notEmpty(user.hashedPassword) && (notEmpty(user.userName) || notEmpty(user.email))) {
        db.isUserNameOccupied(user.userName).then(
            (result) => {
                return db.isEmailOccupied(user.email);
            },
            (result) => {
                res.status(409).send("Username has been occupied");
            }
        ).then((result) => {
            return db.addUser(user);
        }, (result) => {
            res.status(409).send("Email has been occupied");
        }).then((user) => {
            res.send(user);
        }, () => {
            res.status(400).send("Unknown error");
        });

    } else {
        res.status(409).send("Incomplete form.");
    }
});

// @brief return bookmarks of user
router.get('/:userId', function(req, res, next){
   const userId: string = req.params.userId;
   
   if(isValidateId(userId)){
       db.getBookmarksOfUser(userId).then((bookmarks)=>{
           res.send(bookmarks);
       }, (err)=>{
           res.status(400).send({err: err});
       })
   }else{
       res.status(409).send({err: "Invalid userId"})
   }
});

export = router;