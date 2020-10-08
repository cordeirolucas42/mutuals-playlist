const express = require('express')
const app = express()
const port = 5000
var path = require('path');
const session = require('express-session')
const EnvVar = require("dotenv");
EnvVar.config();
var bodyParser = require("body-parser"); //import NPM body-parser
app.use(bodyParser.urlencoded({ extended: true })); //setting body-parser
const Twitter = require("twitter-lite")
const SpotifyWebApi = require("spotify-web-api-node")
app.set("view engine", "ejs"); //setting ejs as standard
app.use(express.static("stylesheets")); //connecting to css and js files
app.use(session({secret: "MUTUALSPLAYLIST"}))

var T = new Twitter({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token_key: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET,
});

async function getFollows(twitterHandle){
    let followCursor = -1
    let friendCursor = -1
    let followers = []
    let following = []

    while (followCursor !== 0 || friendCursor !== 0){
        if (followCursor !== 0){
            const result = await T.get('followers/list', { screen_name: twitterHandle, count: 200, cursor: followCursor})
            followers = followers.concat(result.users.map(user => user.id_str))
            followCursor = result.next_cursor
        }
        if (friendCursor !== 0){
            const result = await T.get('friends/list', { screen_name: twitterHandle, count: 200, cursor: friendCursor})
            following = following.concat(result.users.map(user => user.id_str))
            friendCursor = result.next_cursor
        }
    }
    return [followers,following]
}

class Track {
    constructor(trackID,trackName,trackArtist,trackAlbum){
        this.trackID = trackID
        this.name = trackName
        this.artist = trackArtist
        this.album = trackAlbum
    }
}

class User {
    constructor(spotifyCode){
        this.playlist = []
        this.mutuals = []
        this.spotifyCode = spotifyCode
        this.spotifyApi = new SpotifyWebApi({
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            redirectUri: 'https://mutuals-playlist.herokuapp.com/redirect'
        })
        console.log("new user created")
    }
    SpotifyAuth(accessToken,refreshToken){
        this.refreshToken = refreshToken
        this.accessToken = accessToken
        this.spotifyApi.setAccessToken(accessToken)
        this.spotifyApi.setRefreshToken(refreshToken)
        console.log("authorized spotify")
        // const res = await this.spotifyApi.createPlaylist('Mutuals Playlist', { 'description': 'Playlist with tweeted songs from my mutuals on twitter', 'public': true })
        // this.playlistID = res.body.id
    }
    async TwitterAuth(twitterHandle,twitterID){
        this.twitterHandle = twitterHandle
        this.twitterID = twitterID
        //find mutuals
        [this.followers,this.following] = await getFollows(this.twitterHandle)
        this.mutuals = this.following.filter(id => this.followers.includes(id))        
    }
    async AddTrack(trackID){
        const res = await this.spotifyApi.getTracks(trackID)
        const track = res.body.tracks[0]
        this.playlist.push(new Track(trackID,track.name,track.artists[0].name,track.album.name))
        console.log(this.playlist)
    }
}
users = []

app.get('/', (req, res) => {
    res.render('index', { title: 'Tweet To Spotify' });
})

app.get('/redirect', async (req, res) => {
    console.log("redirect!!!")
    console.log(req.query.code)
    console.log(req.query.state)
    req.session.currentUser = users.length
    console.log(req.session.currentUser)
    const currentUser = req.session.currentUser
    users.push(new User(req.query.code))    
    console.log(users[currentUser].spotifyApi)
    const data = await users[currentUser].spotifyApi.authorizationCodeGrant(req.query.code)
    console.log("access token: " + data.body['access_token'])
    users[currentUser].SpotifyAuth(data.body['access_token'],data.body['refresh_token'])
    res.render('redirect')
})

app.post("/twitter",async (req,res) => {
    const currentUser = req.session.currentUser
    let twitterHandle = req.body.twitterHandle
    let user = await T.get("users/show", {screen_name: twitterHandle})
    console.log("user found: ")
    console.log(JSON.stringify(user))
    await users[currentUser].TwitterAuth(twitterHandle,user.id_str)
    users[currentUser].mutuals.push(users[currentUser].twitterID)
    console.log(JSON.stringify(users[currentUser].mutuals))
})

app.listen(process.env.PORT || 5000, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})