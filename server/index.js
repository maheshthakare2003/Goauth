const express = require('express');
const youtube = require('youtube-api');
const uuid = require('uuid');
const credentials = require('./credentials.json');
const fs = require('fs');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Configure CORS to allow requests from http://localhost:5173
app.use(cors({
  origin: 'http://localhost:5173', // Allow this origin
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

app.post('/upload', async (req, res) => {
  const { title, description, cloudinaryUrl } = req.body;

  if (!title || !description || !cloudinaryUrl) {
    return res.status(400).send('Missing required fields');
  }

  const filename = `${uuid.v4()}.mp4`;

  try {
    await downloadVideoFromCloudinary(cloudinaryUrl, filename);
    
    const authUrl = generateAuthUrl(filename, title, description);
    res.status(200).json({ authUrl }); // Send authUrl back to client
  } catch (error) {
    console.error('Error downloading video from Cloudinary:', error);
    res.status(500).send('Error downloading video from Cloudinary');
  }
});

app.get('/auth', (req, res) => {
  const { filename, title, description } = req.query;
  const authUrl = generateAuthUrl(filename, title, description);
  res.redirect(authUrl);
});

app.get('/oauth2callback', (req, res) => {
  const { code } = req.query;
  const { filename, title, description } = JSON.parse(req.query.state);

  exchangeCodeForTokens(code)
    .then(tokens => {
      return uploadVideoToYouTube(filename, title, description, tokens);
    })
    .then(() => {
      console.log('Video uploaded successfully');
      res.redirect('http://localhost:5173/success');
    })
    .catch(error => {
      console.error('Error uploading video to YouTube:', error);
      res.redirect('/error');
    });
});

function generateAuthUrl(filename, title, description) {
  const oAuth = youtube.authenticate({
    type: 'oauth',
    client_id: credentials.web.client_id,
    client_secret: credentials.web.client_secret,
    redirect_url: credentials.web.redirect_uris[0],
  });

  return oAuth.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/youtube.upload',
    state: JSON.stringify({
      filename,
      title,
      description,
    }),
  });
}

function exchangeCodeForTokens(code) {
  return new Promise((resolve, reject) => {
    const oAuth = youtube.authenticate({
      type: 'oauth',
      client_id: credentials.web.client_id,
      client_secret: credentials.web.client_secret,
      redirect_url: credentials.web.redirect_uris[0],
    });

    oAuth.getToken(code, (err, tokens) => {
      if (err) {
        reject(err);
      } else {
        resolve(tokens);
      }
    });
  });
}

function uploadVideoToYouTube(filename, title, description, tokens) {
  const oAuth = youtube.authenticate({
    type: 'oauth',
    client_id: credentials.web.client_id,
    client_secret: credentials.web.client_secret,
    redirect_url: credentials.web.redirect_uris[0],
  });

  oAuth.setCredentials(tokens);

  return new Promise((resolve, reject) => {
    youtube.videos.insert({
      resource: {
        snippet: { title, description },
        status: { privacyStatus: 'private' },
      },
      part: 'snippet,status',
      media: {
        body: fs.createReadStream(filename),
      },
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function downloadVideoFromCloudinary(cloudinaryUrl, filename) {
  const response = await axios.get(cloudinaryUrl, { responseType: 'stream' });
  const outputStream = fs.createWriteStream(filename);
  response.data.pipe(outputStream);
  return new Promise((resolve, reject) => {
    outputStream.on('finish', () => resolve());
    outputStream.on('error', (err) => reject(err));
  });
}

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
