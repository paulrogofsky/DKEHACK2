var express = require('express');
var router = express.Router();
var request = require ("request");

/* GET home page. */
router.get('/', function(req, res) {
	res.render('index',{additional:"Good"});
});

router.post('/subpage', function(req, res, next) {
 	if (req.body.url === '' || req.body.url === undefined) {
		req.session.alert = 'You must provide a url in order to add to your playlist';
		res.render('index',{additional:'You typed in an invalid url1!'});//failure
	} else {
  		getPage(res,req.body.url);
  	}
});

//void methods below

function getPage (res,url) {
	if (url === '' || url === undefined) {
		res.render('index',{additional:'You typed in an invalid url2!'});//failure
	}
	else {
		request(
			{
				uri: url
				, method: "GET" 
				,  timeout: 10000
	  			, followRedirect: true
	  			, maxRedirects: 10
			}
			, function(error, response, body) {
				if (error === null) {
					console.log(error);
					scraper(res,body);
					res.redirect("/");//MAKE SOMETHING HERE!!!
				}
				else {
					res.render('index',{additional:'You typed in an invalid url3!'});
				}
			}
		);
	}
}

function scraper (res,document) {

}

//listInfo of form, 
function addToSpotify (listInfo) {
	
}

module.exports = router;