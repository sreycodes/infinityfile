var express = require('express');
var router = express.Router();



/*var multer = require('multer');

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./Images");
    },
    filename: function (req, file, callback) {
        callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    }
});
var upload = multer({ storage: Storage }).array("imgUploader", 3);

router.post("/uploadFileToServer", function (req, res) {
    upload(req, res, function (err) {
        if (err) {
            return res.end(err);
        }
        return res.end("File uploaded sucessfully!.");
    });
});*/

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index2', { title: 'Express' });
});

router.get('/urlList', function(req, res) {
    var db = req.db;
    var collection = db.get('hackathon');
    collection.find({},{},function(e,docs){
        res.json(docs);
    });
});

module.exports = router;
