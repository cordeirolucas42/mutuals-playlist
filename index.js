const express = require('express')
const app = express()
const port = 5000
var path = require('path');
const EnvVar = require("dotenv");
EnvVar.config();
const Twitter = require("twitter-lite")
const SpotifyWebApi = require("spotify-web-api-node")

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index', { title: 'Tweet To Spotify' });
})

app.get('/redirect', (req, res) => {
    console.log("redirect!!!")
    console.log(req.query.code)
    console.log(req.query.state)
    res.render('redirect')
})

app.listen(process.env.PORT || 5000, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})