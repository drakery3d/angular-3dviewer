const express = require('express');
const path = require('path');

const app = express();

const dist = path.join(__dirname, '../dist/viewer');
app.use(express.static(dist));

app.get('/*', function (req, res) {
  res.sendFile(path.join(dist, 'index.html'));
});

app.listen(process.env.PORT || 8080);
