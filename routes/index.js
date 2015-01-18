var express = require('express');
var router = express.Router();
var request = require ("request");

/* GET home page. */
router.get('/', function(req, res) {
	res.render('index');
});

router.post('/subpage', function(req, res, next) {
  if (req.body.url === '' || req.body.url === undefined) {
    req.session.alert = 'You must provide a url in order to add to your playlist';
    res.render('index');//failure
  } else {
  	scraper(req.body.url);
  }
});

//void methods below

//should call addToSpotify within this method
function scraper (url) {

}

//listInfo of form [(song,artist)]
function addToSpotify (listInfo) {

}

module.exports = router;