const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from data and lib directories
app.use('/data', express.static(path.join(__dirname, 'data')));
app.use('/lib', express.static(path.join(__dirname, 'lib')));

// Serve root directory for mapper.html and mapper.js
app.use(express.static(__dirname));

// Utility to get available Surahs
function getAvailableSurahs() {
    const timestampDir = path.join(__dirname, 'data', 'timestamp');
    const files = fs.readdirSync(timestampDir);
    return files
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const match = f.match(/^(\d+)[_-](.+)\.json$/);
            return match ? { id: match[1], name: match[2].replace(/-/g, ' ') } : null;
        })
        .filter(Boolean)
        .sort((a, b) => parseInt(a.id) - parseInt(b.id));
}

// Route for the Homepage (Surah Index)
app.get('/', (req, res) => {
    const surahs = getAvailableSurahs();
    res.render('index', { surahs });
});

// Route for a Specific Surah (Athar Reader)
app.get('/surah/:id', async (req, res) => {
    try {
        const surahId = req.params.id.padStart(3, '0');
        
        // 1. Fetch Arabic Text from AlQuran Cloud
        const apiResponse = await fetch(`https://api.alquran.cloud/v1/surah/${parseInt(surahId)}/quran-uthmani`);
        const apiData = await apiResponse.json();
        const arabicText = apiData.data.ayahs.map(a => a.text);

        // 2. Load Local Timestamps
        const timestampDir = path.join(__dirname, 'data', 'timestamp');
        const tsFile = fs.readdirSync(timestampDir).find(f => f.startsWith(surahId));
        const timestampData = JSON.parse(fs.readFileSync(path.join(timestampDir, tsFile), 'utf-8'));

        // 3. Find Local Audio File
        const audioDir = path.join(__dirname, 'data', 'audio');
        const audioFile = fs.readdirSync(audioDir).find(f => f.startsWith(surahId));

        res.render('athar', { 
            surahData: timestampData, 
            arabicText: arabicText,
            audioPath: `/data/audio/${audioFile}`
        });
    } catch (e) {
        console.error(e);
        res.status(404).send("Surah not found or data missing.");
    }
});

// Route for the Mapper tool
app.get('/mapper', (req, res) => {
    res.sendFile(path.join(__dirname, 'mapper.html'));
});

app.listen(port, () => {
    console.log(`🚀 Athar Server running at http://localhost:${port}`);
    console.log(`🔗 Index: http://localhost:${port}`);
    console.log(`🔗 Mapper: http://localhost:${port}/mapper`);
});
