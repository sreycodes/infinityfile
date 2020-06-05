var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var imgur = require('imgur-node-api');
var request = require('request');
require('dotenv').config();

var Jimp = require("jimp");
var fs = require("fs");
var shuffleSeed = require("shuffle-seed");

var mongo = require('mongodb');
var uri = 'mongodb://' + process.env.DBUSER + ':' + process.env.DBPASSWORD + '@ds055772.mlab.com:55772/fileuploadinfo';

var multer = require('multer');
imgur.setClientID(process.env.CLIENTID);

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
	mongo.MongoClient.connect(uri, function(err, client) {
		if(err) throw err;
		req.db = client.db('fileuploadinfo')
		next();
	});
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
	var db = req.db
	var linksCollection = db.collection('links')
	console.log("At upload file route")
	var file = '';
	var actualFileName = '';
	var extension = '';
	upload(req, res, function (err) {
		if (err) {
			return res.end(err+"");
		} else {
			console.log("Second callback")
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
			console.log("Shuffled: " + shuffled);
			var myBuffer = fs.readFileSync('./Images/' + req.file.filename); //fileUploaded
			// console.log("In the buffer array " + myBuffer);
			console.log("Buffer length: " + myBuffer.byteLength);

			// const png_header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
			// var image = Buffer.concat([png_header, myBuffer])

			var image = new Jimp(1000, 1250, 0x00000000, function(err, image) {
				var myFileSize = myBuffer.byteLength;
				var buf_idx = 0
				var first_id = image.getPixelIndex(0, 0);
				image.bitmap.data[first_id] = myFileSize / 65536;
				image.bitmap.data[first_id + 1] = (myFileSize % 65536)/256;
				image.bitmap.data[first_id + 2] = myFileSize % 256;
				image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
					if(idx !== 0) {
						// console.log("idx: " + idx + " and buf_idx: " + buf_idx)
						if(buf_idx >= myFileSize) {
							// console.log(idx)
							return;
						}
						image.bitmap.data[idx] = shuffled[myBuffer[buf_idx++]];

						if(buf_idx >= myFileSize) return;
						image.bitmap.data[idx + 1] = shuffled[myBuffer[buf_idx++]];

						if(buf_idx >= myFileSize) return;
						image.bitmap.data[idx + 2] = shuffled[myBuffer[buf_idx++]];

						if(buf_idx >= myFileSize) return;
						image.bitmap.data[idx + 3] = 255;
					}
				});
				console.log("Image created");
				// console.log(JSON.stringify(image))
				file = './Images/' + actualFileName + '.png'; //fileName
				console.log("File will be written at " + file);
				image.write(file, function() {
					imgur.upload(file, function (err, res) {
						var linkjson = {"link": res.data.link, "filename": actualFileName, "extension": extension }; 
						console.log(linkjson)
						linksCollection.insertOne(linkjson).then((err, res) => {
							console.log(err)
							console.log(res)
							console.log('Done')
						});
					});
				});
				console.log("File written");
			/*
			var myBuffer2 = image.bitmap.data;
			console.log(image.bitmap.data);
			fs.writeFile("./wow3.pdf", myBuffer2);
			*/
			});
		}
	});
	
	/*fs.unlinkSync('./Images/' + actualFileName + extension, (err) => {
		if (err) throw err;
		res.end('Successful');
	});*/
	res.end();

});

app.post('/downloadFileToServer', function(req, res) {

	var db = req.db
	var linksCollection = db.collection('links')
	var actualFileName = req.body.filename.replace(/\.[^/.]+$/, "");
	var extension = /(?:\.([^.]+))?$/.exec(req.body.filename)[1]
	var filePath = './Images/' + actualFileName + '.png';
	console.log(filePath)
	var a = [];
	for(var i = 0; i < 256; i = i + 1){
	  a[i] = i;
	}
	var shuffled = shuffleSeed.shuffle(a, req.body.key); //password-retrieve
	var unshuffled = [];
	for(var i = 0; i < 256; i = i + 1){
	  unshuffled[shuffled[i]] = i;
	}
	linksCollection.find({'filename': actualFileName, 'extension': '.' + extension}).toArray((err, rows) => {
		console.log(rows)
		row = rows[0]
		link = row.link
		console.log("Reading from image and converting to text.");
		Jimp.read(link, function(err, image2){ //filename retrived from imgur
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
			fs.writeFile('./Texts/'+ actualFileName + '.' + extension, myBuffer4, (err) => {
			  if (err) throw err;
			  console.log('The file has been saved!');
			}); //filename
			console.log("File written")
		});
		res.end();
	});
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
