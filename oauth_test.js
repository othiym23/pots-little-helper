var sys = require('sys');
var OAuth2 = require('oauth').OAuth2;

var auth = {};

var glitch_keys = {
    client_id     : '142-2104cf61bd896bbb417d33307fc1cde1bc25b1f9'
  , client_secret : '5d9a6db27fd80f69d129093cf75355b16b835164'
};

var glitch = new OAuth2(
    glitch_keys.client_id
  , glitch_keys.client_secret
  , 'https://api.glitch.com'
  , '/oauth2/authorize'
  , '/oauth2/token'
);
/*
 * Later drafts of OAuth2 require the access token to be named access_token
 * (or at least that's what the oauth library thinks), but Glitch has other
 * ideas.
 */
glitch.setAccessTokenName('oauth_token');

var glitch_oauth_params = {
    "grant_type"    : "authorization_code"
  , "scope"         : "read"
  , "response_type" : "code"
  , "redirect_uri"  : "http://pot.lvh.me:1982/save_auth"
  , "state"         : "pot_setup"
};

// if no access token: go to the authorization URL...
if (!auth.access_token) {
    glitch.getAuthorizeUrl(glitch_oauth_params);
}

// ...with a callback URL of save_auth that takes the code and uses it to request an access token
glitch.getOAuthAccessToken('code', glitch_oauth_params, function (error, access_token, refresh_token) {
    if (error) {
        console.log('error: ' + sys.inspect(error));
    } else {
        console.log('access_token: ' + access_token);
        console.log('refresh_token: ' + refresh_token);
        auth.access_token = access_token;
    }
});

// ...which is then used everywhere else
glitch.get('http://api.glitch.com/simple/avatar.getDetails', auth.access_token, function (error, data) {
    console.log(sys.inspect(data));
});