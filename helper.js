var fs         = require('fs')
    , haml     = require('haml')
    , oauth    = require('oauth')
    , strata   = require('strata')
    , redirect = strata.redirect
    ;

var config = JSON.parse(fs.readFileSync('./config/config.json', 'utf-8'));

var OAuth2 = oauth.OAuth2;
var glitch = new OAuth2(
    config.oauth.client_id
  , config.oauth.client_secret
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

var _api_base = 'https://api.glitch.com/simple';

var app = new strata.Builder;
app.use(strata.commonLogger);
app.use(strata.contentType, "text/html");
app.use(strata.contentLength);
app.use(strata.sessionCookie);

app.get("/", function (env, callback) {
    if (env.session.oauth_token) {
        var check_url = _api_base + '/auth.check';

        glitch.get(check_url, env.session.oauth_token, function (error, data) {
            var player_details;
            if (error) {
                console.log("unable to check auth because of HTTPS error: " + error);
            }
            else {
                player_details = JSON.parse(data);

                if (player_details.ok == 1) {
                    var inventory_url = _api_base + '/players.inventory';
                    glitch.get(inventory_url, env.session.oauth_token, function (error, inventory) {
                        var template_src = fs.readFileSync('./views/index.haml', 'utf-8');
                        var template = haml(template_src);

                        callback(200, {}, template({"inventory" : inventory, "player_name" : player_details.player_name}));
                    });
                }
                else {
                    console.log("Oh dear, got this error: " + player_details.error);
                }
            }
        });
    }
    else {
        console.log("access token not set, redirecting to /auth")
        redirect.forward(env, callback, '/auth');
    }
});

app.get("/auth", function (env, callback) {
    redirect(env, callback, glitch.getAuthorizeUrl(glitch_oauth_params));
});

app.get("/save_auth", function (env, callback) {
    var req = new strata.Request(env);
    req.params(function (err, params) {
        env.session.oauth_code = params.code;

        // ...with a callback URL of save_auth that takes the code and uses it to request an access token
        glitch.getOAuthAccessToken(env.session.oauth_code, glitch_oauth_params, function (error, access_token, refresh_token) {
            if (error) {
                console.log('error: ' + sys.inspect(error));
            } else {
                console.log('access_token: ' + access_token);
                console.log('refresh_token: ' + refresh_token);
                env.session.oauth_token = access_token;
                redirect.back(env, callback);
            }
        });
    });
});

module.exports = app;
