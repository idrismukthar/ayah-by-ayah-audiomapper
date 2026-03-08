const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from data and lib directories
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use('/lib', express.static(path.join(__dirname, 'lib')));

// Serve mapper files directly
app.use(express.static(__dirname));

// Route for the Athar Reader (Prototype)
app.get('/', (req, res) => {
    res.render('athar');
});

// Route for the Mapper tool
app.get('/mapper', (req, res) => {
    res.sendFile(path.join(__dirname, 'mapper.html'));
});

app.listen(port, () => {
    console.log(`🚀 Athar Server running at http://localhost:${port}`);
    console.log(`🔗 Prototype: http://localhost:${port}`);
    console.log(`🔗 Mapper: http://localhost:${port}/mapper`);
});
