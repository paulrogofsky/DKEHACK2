var express = require('express');
var router = express.Router();
var request = require ("request");
var htmlToText = require("html-to-text")
var redirect_url = 'http://localhost:3000/spotifylogin';
var c_id = 'f590175fde554cd8ab590260197f14de'
var c_secret = 'ea8520e7b0374356a539bf927eac249e';
var querystring = require('querystring');
var scopes = 'playlist-modify-public playlist-modify-private';

/* GET home page. */
router.get('/', function(req, res) {
	res.render('index',{additional:"Start!",form_display:"none",login_display:"inline"});
});

router.get('/success', function (req,res) {
	res.render('success');
});

router.get('/query', function (req,res) {
	res.render('query');
});

router.get('/login', function (req,res) {
	res.redirect('https://accounts.spotify.com/authorize?' 
		+ querystring.stringify({
				client_id : c_id
				, response_type : 'code'
				, redirect_uri : redirect_url
				, scope : scopes
				, show_dialog : false
			}
		)
	);
});

router.post('/playlistGen', function(req, res, next) {
 	if (req.body.url === '' || req.body.url === undefined || req.body.playlist === '' || req.body.playlist === undefined){
		req.session.alert = 'You must provide a url or playlist name in order to add to your playlist';
		res.render('index',{additional:'You typed in an invalid url!'});//failure
	} else {
		var auth_code = req.session.auth_code;
		request (
			{
				uri : 'https://accounts.spotify.com/api/token'
				, method : 'POST'
				, form : {
					grant_type : 'authorization_code'
					, code : auth_code
					, redirect_uri : redirect_url
				}
				, headers : {
					Authorization : 'Basic ' + new Buffer(c_id + ":" + c_secret).toString("base64")
				}
			}
			, function(error,response,body) {
				var bod = JSON.parse(body);
				getWebPage(res,req.body.url,req.body.playlist,bod.access_token,bod.refresh_token)
			 }
		);
  	}
});

router.get('/spotifylogin', function(req,res) {
	if (req.param('error') !== null && req.param('code') === null) {
		res.render('index',{additional:"Invalid Spotify Login!"});
	} 
	else {
		req.session.auth_code = req.param('code');
		res.render('index',{additional:"You are logged in to Spotify and can now use the website"
			,form_display:"inline",login_display:"none"});
	}
});

//void methods below

function getWebPage (res,url,playlist,access_token,refresh_token) {
	if (url === '' || url === undefined) {
		res.render('index',{additional:'You typed in an invalid url!',form_display:"none",login_display:"inline"});//failure
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
					scraper(body,playlist,access_token,refresh_token);
					res.redirect("/success");//MAKE SOMETHING HERE!!!
				}
				else {
					res.render('index',{additional:'You typed in an invalid url!',form_display:"none",login_display:"inline"});
				}
			}
		);
	}
}

function scraper (document,playlist,access_token,refresh_token) {
	var text = htmlToText.fromString(document, {
    wordwrap: 130
	});

	array = text.replace(/(\s[a-z][\w\d]*)/g, '').replace(/(\s\[[^\[\]]*\])/g, '').split('\n');

	for(var i = array.length - 1; i >= 0; i--) {
	    if(array[i].trim() === '' || array[i].trim().split(' ').length < 3 || array[i].trim().split(' ').length > 15) {
	       array.splice(i, 1);
	    }
	}

	console.log(array);

	var queries = ['babel','rompe, daddy yankee','lil bow wow basketball', '"grillz" nelly', 'daniel powter, bad day'];
	getID(queries,playlist,access_token,refresh_token);
}

function getID(queries,playlist,access_token,refresh_token) {
	request ( 
		{
			uri : 'https://api.spotify.com/v1/me'
			, method : "GET"
			,  timeout: 10000
	  		, followRedirect: true
	  		, maxRedirects: 10
	  		, headers : {
				Authorization : 'Bearer ' + access_token
			}
		}
		, function (error, response, body) {
			var user_id = JSON.parse(body).id;
			makePlaylist(queries,playlist,access_token,refresh_token,user_id);
		}
	);
}

function makePlaylist(queries,playlist,access_token,refresh_token,user_id) {
	request ( 
		{
			uri : 'https://api.spotify.com/v1/users/' + user_id + '/playlists'
			, method : "POST"
	  		, headers : {
				"Authorization" : 'Bearer ' + access_token
				, "Content-Type" : "application/json"
			}
			, dataType : 'json'
			, body : JSON.stringify({
				"public" : false
				, "name" : playlist
			})
		}
		, function (error, response, body) {
			var playlist_id = JSON.parse(body).id;
			for (query in queries) {
				spotifyQueryResults(query,access_token,refresh_token,user_id, playlist_id);	
			}
		}
	);
}

function spotifyQueryResults(query,access_token,refresh_token,user_id, playlist_id) {
	request ( 
		{
			uri : 'https://api.spotify.com/v1/search?' 
				+ querystring.stringify(
					{
						type : 'track' //'track,artist'
						, limit : 5 //can increase with more uncertainty
						, q : query
					}
				)
			, method : "GET"
			,  timeout: 10000
	  		, followRedirect: true
	  		, maxRedirects: 10
	  		, headers : {
				Authorization : 'Bearer ' + access_token
			}
		}
		, function (error, response, body) {
			//todo figure out which one is the most similar
			var first_item = JSON.parse(body).tracks.items[0];
			// artist: first_item.artists[0].name
			// track : first_item.name
			// album : first_item.album.name
			spotifyAddIntoPlaylist(first_item.uri,access_token,refresh_token,user_id,playlist_id);
		}
	);
}

function spotifyAddIntoPlaylist(uri,access_token,refresh_token,user_id,playlist_id) {
	var strs = ['https://api.spotify.com/v1/users/',user_id,'/playlists/',playlist_id,'/tracks?'];
	request (
		{
			uri : strs.join('') + querystring.stringify({
				position : 0
				, uris : uri
			})
			, method : "POST"
			, headers : {
				Authorization : 'Bearer ' + access_token
				, Accept : "application/json"
			}
		}
		, function (error, response, body) {
			console.log(body);
		}
	);
}

module.exports = router;