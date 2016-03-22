import express = require("express");
import db = require("../db")

const router = express.Router();

router.get('/', function(req, res, next){
    res.send("Hello world");
})

export = router;