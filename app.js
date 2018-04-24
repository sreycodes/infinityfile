var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var imgur = require('imgur-node-api');
var download = require('download-file');
var request = require('request');

var Jimp = require("jimp");
var fs = require("fs");
var shuffleSeed = require("shuffle-seed");

var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/hackathon');

var multer = require('multer');
imgur.setClientID('e9edb3ed9882935');

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./Images");
    },
    filename: function (req, file, callback) {
    	callback(null, file.originalname);
    }
});

var upload = multer({ storage: Storage }).single('imgUploader');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

app.use(function(req,res,next){
    req.db = db;
    next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

app.post("/uploadFileToServer", function (req, res) {
	console.log("nikg");
	var file = '';
	var actualFileName = '';
	var extension = '';
    upload(req, res, function (err) {
    	if (err) {
            return res.end(err+"");
        } else {

    		var fileUploaded = req.file;
    		actualFileName = req.file.filename;
    		var encryptionKey = req.body.key;
    		extension = actualFileName.substring(actualFileName.lastIndexOf("."));
    		actualFileName = actualFileName.substring(0, actualFileName.lastIndexOf(extension));

    		var a = [];
    		for(var i = 0; i < 256; i = i + 1){
      			a[i] = i;    
    		}
    		// console.log(a);
			var shuffled = shuffleSeed.shuffle(a, encryptionKey); //password
			console.log(shuffled);

		    console.log("Started");
		    var myBuffer = fs.readFileSync('./Images/' + req.file.filename); //fileUploaded
		    console.log("In the buffer array");
		    console.log(myBuffer);
		    var image = new Jimp(1000, 1250, 0x00000000, function(err, message){
		        });
		    console.log(image);
		    console.log(myBuffer.byteLength);
		    var myFileSize = myBuffer.byteLength;
		    var cntr = 0;
		    var first_id = image.getPixelIndex(0, 0);
		    image.bitmap.data[first_id] = myFileSize / 65536;
		    image.bitmap.data[first_id + 1] = (myFileSize % 65536)/256;
		    image.bitmap.data[first_id + 2] = myFileSize % 256;
		    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx){
		        if(x !== 0 || y !== 0){
		        if(cntr >= myFileSize)	return ;
		        this.bitmap.data[idx] = shuffled[myBuffer[cntr++]];
		        if(cntr + 1 >= myFileSize)	return ;
		        this.bitmap.data[idx + 1] = shuffled[myBuffer[cntr++]];
		        if(cntr + 2 >= myFileSize)	return ;
		        this.bitmap.data[idx + 2] = shuffled[myBuffer[cntr++]];
		        if(cntr + 3 >= myFileSize)	return ;
		        this.bitmap.data[idx + 3] = 255;
		        }
		        });
		    console.log("Image created");
		    file = './Images/' + actualFileName.hashCode() + '.png'; //fileName
		    console.log("rfvnf" + file);
		    image.write(file, function() {
	    		var url = 'https://uploads.im/api?upload=' + file;
	    		request.post(url, (err, res, body) => {
				  if (err) { return console.log(err); }
				  console.log(body.url);
				  console.log(body.explanation);
				});
		    	imgur.upload(file, function (err, res) {
					var linkjson = {"link": res.data.link, "filename":actualFileName, "extension": extension }; 
					db.get('hackathon').insert(linkjson);
				

				});
		    });
		    console.log("File written");
		    /*
		    var myBuffer2 = image.bitmap.data;
		    console.log(image.bitmap.data);
		    fs.writeFile("./wow3.pdf", myBuffer2);
		    */
		    
		}
	});
    
	/*fs.unlinkSync('./Images/' + actualFileName + extension, (err) => {
		if (err) throw err;
		res.end('Successful');
	});*/
	res.end();

});

app.post('/downloadFileToServer', function(req, res) {

	var extension = '';
	var actualFileName = req.body.filename;
	console.log(req.body.link);
	var filepath2 = "encrypted" + ".jpg";//(req.body.link.endsWith(".png")) ? ".png" : ".jpg";

	db.collection("hackathon").findOne({"filename": req.body.filename}, function(err, res) {
		if (err) throw err;
		var options = {
    	directory: "./Texts",
    	filename: filepath2
		};
		extension = res.extension;
	 	download(res.link, options, function(err){
	    	if (err) {
	    		throw err;
	    	} else {
	    		console.log("File Downloaded");

	    		var filePath = path.join('./Texts', filepath2);

				var a = [];
			    for(var i = 0; i < 256; i = i + 1){
			      a[i] = i;
			    }
			    var shuffled = shuffleSeed.shuffle(a, req.body.key); //password-retrieve
			    var unshuffled = [];
			    for(var i = 0; i < 256; i = i + 1){
			      unshuffled[shuffled[i]] = i;
			    }

			    console.log("Reading from image and converting to text.");
			    Jimp.read(filePath, function(err, image2){ //filename retrived from imgur
			        var myBuffer3 = image2.bitmap.data;
			        console.log(myBuffer3);
			        var i = 0, cntr = 0;
			        var first_id = image2.getPixelIndex(0, 0);
			        var file_size = image2.bitmap.data[first_id]*65536 + image2.bitmap.data[first_id+1]*256 + image2.bitmap.data[first_id+2];
			        console.log(file_size);
			        var netSize = image2.bitmap.width * image2.bitmap.height * 4;
			        var myBuffer4 = new Buffer(file_size);
			        while(i < netSize){
			          if((i % 4) !== 3 && i > 3){
			            myBuffer4[cntr++] = unshuffled[myBuffer3[i]];
			          }
			          if(cntr === file_size + 1){
			            break;
			          }
			          i++;
			        }
			        // console.log(image2.bitmap.data);
			        // console.log(myBuffer3);
			        console.log(myBuffer4);
			        // console.log(image2.hash());
			        fs.writeFile('./Texts/'+ actualFileName + extension, myBuffer4); //filename
    			});
			}	 

	    });
    	db.close();
    	res.end("File read");
	});

	res.end();
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
