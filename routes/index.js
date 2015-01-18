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
  		addToSpotify(new Object ());
  	}
});

//void methods below

function getPage (res,url) {
	if (url === '' || url === undefined) {
		res.render('index',{additional:'You typed in an invalid url2!'});//failure
	}
	else {
		var re1 = /https:\/\/(\w+)/g;
		var re2 = /http:\/\/(\w+)/g;
		if (!re1.test(url) && !re2.test(url)) {
			url = 'https://' + url;
		}
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
	request(
		{
			uri: 'https://accounts.spotify.com/api/token'
			, method : "POST"
			, form : {
				grant_type : "client_credentials"
			}
			, headers : {
				Authorization: "Basic fbd5ad1a043b4a4f9e014fab620a9690eec73e1c86824f8583ebfaa94ff93893"
			}
		}
		, function (error, response,body) {
			console.log(body);
		}
	);
}

module.exports = router;