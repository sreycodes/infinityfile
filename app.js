const express = require('express');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const request = require('request');
require('dotenv').config();

const Jimp = require("jimp");
const fs = require("fs");
const shuffleSeed = require("shuffle-seed");

const mongo = require('mongodb');
const uri = 'mongodb://' + process.env.DBUSER + ':' + process.env.DBPASSWORD + '@ds055772.mlab.com:55772/fileuploadinfo';

const multer = require('multer');

const Storage = multer.diskStorage({
	destination: function (req, file, callback) {
		callback(null, "./Uploads");
	},
	filename: function (req, file, callback) {
		callback(null, file.originalname);
	}
});

const upload = multer({ storage: Storage })
const app = express();

app.use(function(req,res,next){
	mongo.MongoClient.connect(uri, function(err, client) {
		if(err) throw err;
		req.db = client.db('fileuploadinfo')
		next();
	});
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));

app.post("/register", function(req, res) {
	let db = req.db
	let usersCollection = db.collection('users')
	let username = req.body.username
	usersCollection.findOne({'name': username}, function(err, doc) {
		if(err) {
			res.sendStatus(500)
		} else {
			if(doc != null) {
				res.status(403).send('Username is already taken')
			} else {
				usersCollection.insertOne({'name': username}, function(err, r) {
					if(err) {
						res.status(500).send('Could not insert username. Try again!')
					} else {
						res.sendStatus(200)
					}
				});
			}
		}
	});
});

app.post("/uploadSingleFile", upload.single('singleFile'), function (req, res, next) {
	let db = req.db
	let linksCollection = db.collection('links')
	let usersCollection = db.collection('users')
	let fileUploaded = req.file;
	let encryptionKey = req.body.key;
	let username = req.body.username
	let filename = req.file.filename;
	let extension = /(?:\.([^.]+))?$/.exec(filename)[1]
	let actualFileName = filename.replace(/\.[^/.]+$/, "");

	usersCollection.findOne({'name': username}, function(err, doc) {
		if(err) {
			console.log(err)
			res.sendStatus(500);
			return;
		}
		if(doc == null) {
			res.status(403).send('Username not found');
			return;
		}
		linksCollection.findOne({'uploader': username, 'filename': filename}, function(err, doc) {
			if(err) {
				console.log(err)
				res.sendStatus(500);
				return;
			}
			if(doc != null) {
				res.status(403).send('You have already uploaded a file with the same filename.');
				return;
			}
			let a = [...Array(256).keys()];
			let shuffled = shuffleSeed.shuffle(a, encryptionKey);
			let imgBuffer = fs.readFileSync('./Uploads/' + req.file.filename);
			let imgFileSize = imgBuffer.byteLength;
			let imgHeight = imgWidth = Math.ceil(Math.sqrt(imgFileSize)) + 1

			let image = new Jimp(imgHeight, imgWidth, function(err, image) {
				let buf_idx = 0
				let first_id = image.getPixelIndex(0, 0);
				image.bitmap.data[first_id] = imgFileSize / 65536;
				image.bitmap.data[first_id + 1] = (imgFileSize % 65536)/256;
				image.bitmap.data[first_id + 2] = imgFileSize % 256;
				image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
					if(idx !== 0) {
						if(buf_idx >= imgFileSize) {
							return;
						}
						image.bitmap.data[idx] = shuffled[imgBuffer[buf_idx++]];
						if(buf_idx >= imgFileSize) return;
						image.bitmap.data[idx + 1] = shuffled[imgBuffer[buf_idx++]];
						if(buf_idx >= imgFileSize) return;
						image.bitmap.data[idx + 2] = shuffled[imgBuffer[buf_idx++]];
						if(buf_idx >= imgFileSize) return;
						image.bitmap.data[idx + 3] = 255;
					}
				});
				file = './Images/' + actualFileName + '.png';
				image.write(file, function() {
					var options = {
				        url: 'https://api.imgur.com/3/upload',
				        headers: {
		          			'Authorization': 'Client-ID ' + process.env.CLIENTID
				        },
				        formData: {
				        	type: 'file',
				        	image: fs.createReadStream(file)
				        }
			      	};
					request.post(options, function (err, req, body) {
						if(err) {
							console.log(err)
							res.sendStatus(500);
							return;
						}
						body = JSON.parse(body)
						var linkjson = {"link": body.data.link, "filename": filename, "uploader": username}; 
						linksCollection.insertOne(linkjson).then(function(cmdRes) {
							res.sendStatus(200);
							return;
						}).catch(function(err) {
							res.sendStatus(500);
							return;
						});
					});
				});
			});
		});
	});
});

app.post('/downloadSingleFile', function(req, res, next) {

	let db = req.db
	let linksCollection = db.collection('links')
	let usersCollection = db.collection('users')
	let encryptionKey = req.body.key;
	let username = req.body.username
	let filename = req.body.filename;
	let extension = /(?:\.([^.]+))?$/.exec(filename)[1]
	let actualFileName = filename.replace(/\.[^/.]+$/, "");
	let filePath = './Images/' + actualFileName + '.png';

	let a = [...Array(256).keys()];
	let shuffled = shuffleSeed.shuffle(a, encryptionKey);
	let unshuffled = [];
	for(var i = 0; i < 256; i = i + 1){
	  unshuffled[shuffled[i]] = i;
	}
	linksCollection.find({'filename': filename, 'uploader': username}).toArray((err, docs) => {
		if(err) {
			res.sendStatus(500);
			return;
		}
		if(docs == null) {
			res.status(403).send('You have not uploaded a file with this name');
			return;
		}
		link = docs[0].link
		Jimp.read(link, function(err, image){ //filename retrived from imgur
			let imgBuffer = image.bitmap.data;
			let i = 0, cntr = 0;
			let first_id = image.getPixelIndex(0, 0);
			let file_size = image.bitmap.data[first_id]*65536 + image.bitmap.data[first_id+1]*256 + image.bitmap.data[first_id+2];
			let netSize = image.bitmap.width * image.bitmap.height * 4;
			let fileBuffer = new Buffer(file_size);
			while(i < netSize){
				if((i % 4) !== 3 && i > 3){
					fileBuffer[cntr++] = unshuffled[imgBuffer[i]];
				}
				if(cntr === file_size + 1){
					break;
				}
				i++;
			}
			filePath = './Downloads/'+ filename
			fs.writeFile(filePath, fileBuffer, (err) => {
				if (err) {
					res.sendStatus(500);
					return;
				}
				res.status(200).sendFile(path.join(__dirname, filePath))
				return;
			});
		});
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
