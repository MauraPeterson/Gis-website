const express = require('express');
const fs = require('fs');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.post('/save-phoenix-data', (req, res) => {
  const data = req.body;
  fs.writeFile('../resources/updated/phoenix_updated.json', JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error('Error writing data:', err);
      res.status(500).send('Failed to save data');
    } else {
      res.send('Data saved successfully');
    }
  }); 
});

app.post('/save-city-blockgroups', (req, res) => {
  const { city } = req.params;
  const data = req.body;
  console.log(city);
  fs.writeFile(`../resources/updated/${city}_updated.json`, JSON.stringify(data, null, 2), (err) => {

    if (err) {
      console.error('Error writing data:', err);
      res.status(500).send(`Failed to save data for ${city}`);
    } else {
      res.send('Data saved successfully');
    }
  }); 
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
