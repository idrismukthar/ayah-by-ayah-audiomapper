let ws;
let stamps = [];
let lastStampTime = 0;
let directoryHandle = null;
let isStreamingMode = false;

// UI Elements
const fileList = document.getElementById('fileList');
const fileInfo = document.getElementById('fileInfo');
const surahNumInput = document.getElementById('surahNum');
const surahTitleInput = document.getElementById('surahTitle');
const markerBody = document.getElementById('markerBody');
const zoomSlider = document.getElementById('zoomSlider');
const statusDiv = document.getElementById('status');
const folderStatus = document.getElementById('folderStatus');
const stampsList = document.getElementById('stamps-list');

// Initialize WaveSurfer
try {
    ws = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#555',
        progressColor: '#c5a059', 
        cursorColor: '#fff',
        height: 250,
        minPxPerSec: 10,
        backend: 'MediaElement',
        fillParent: true,
        responsive: true,
        scrollParent: true, // Improved scrolling
        plugins: [ 
            WaveSurfer.regions.create({
                dragSelection: false
            }) 
        ]
    });

    ws.on('loading', (percent) => {
        statusDiv.innerText = `⏳ Loading Audio: ${percent}%`;
    });

    ws.on('ready', () => {
        statusDiv.innerText = "✅ Ready to Map";
        if (isStreamingMode) {
            statusDiv.innerHTML += ' <span style="color:var(--red)">[STREAMING MODE ACTIVE]</span>';
        }
    });

    ws.on('error', (err) => {
        console.error("WaveSurfer Error:", err);
        statusDiv.innerText = "❌ Error: " + err;
    });

    // Handle Region Updates (Cropping)
    ws.on('region-update-end', (region) => {
        const index = stamps.findIndex(s => s.id === region.id);
        if (index !== -1) {
            stamps[index].start = region.start.toFixed(2);
            stamps[index].end = region.end.toFixed(2);
            renderTable();
        }
    });

} catch (e) {
    console.error("WaveSurfer Init Error:", e);
    statusDiv.innerText = "Error loading WaveSurfer.";
}

// Zoom Control
if (zoomSlider) {
    zoomSlider.oninput = () => {
        const val = Number(zoomSlider.value);
        ws.zoom(val);
    };
}

// Speed Control
function changeSpeed(val) {
    if (ws) {
        ws.setPlaybackRate(parseFloat(val));
        statusDiv.innerText = "Speed: " + val + "x";
    }
}

// Rewind to Last Verse
function rewindLast() {
    if (stamps.length > 0) {
        const last = stamps[stamps.length - 1];
        jumpToStamp(last.start);
        statusDiv.innerText = "⏪ Rewound to Ayah " + last.ayah;
    }
}

// Jump to specific time
function jumpToStamp(time) {
    if (ws) {
        ws.setCurrentTime(parseFloat(time));
        ws.play();
    }
}

// Delete specific stamp
function deleteStamp(id) {
    const index = stamps.findIndex(s => s.id === id);
    if (index !== -1) {
        stamps.splice(index, 1);
        // Recalculate Ayah numbers
        stamps.forEach((s, i) => s.ayah = i + 1);
        ws.clearRegions();
        stamps.forEach(s => {
            ws.addRegion({
                id: s.id,
                start: s.start,
                end: s.end,
                color: 'rgba(255, 77, 77, 0.4)',
                drag: true,
                resize: true
            });
        });
        renderTable();
        statusDiv.innerText = "🗑️ Stamp deleted";
    }
}

// File Loader
document.getElementById('fileInput').onchange = (e) => {
    const files = Array.from(e.target.files);
    fileList.innerHTML = '';
    
    if(files.length === 0) {
        fileInfo.innerText = "";
        return;
    }

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
    fileInfo.innerText = `${files.length} file(s) selected`;

    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerText = file.name;
        div.onclick = () => {
            document.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
            div.classList.add('active');
            
            const objectUrl = URL.createObjectURL(file);
            isStreamingMode = file.size > 50 * 1024 * 1024; 
            
            if (isStreamingMode) {
                statusDiv.innerText = "⚡ Streaming Mode Active...";
                ws.load(objectUrl, [0, 0, 0, 0, 0]); 
            } else {
                ws.load(objectUrl);
            }
            
            stamps = [];
            ws.clearRegions();
            renderTable();
            
            let name = file.name.replace(/\.[^/.]+$/, "");
            let sNumMatch = name.match(/^\d+/);
            surahNumInput.value = sNumMatch ? sNumMatch[0] : "";
            surahTitleInput.value = name.replace(/^\d+[\s\-_]*/, "").trim();
            statusDiv.innerText = "Mapping: " + file.name;
        };
        fileList.appendChild(div);
    });
};

function markAyah() {
    if (!ws.isPlaying() && ws.getCurrentTime() === 0) return;
    
    let nowMs = Date.now();
    if (nowMs - lastStampTime < 300) return;
    lastStampTime = nowMs;

    let now = ws.getCurrentTime().toFixed(2);
    let lastEnd = stamps.length > 0 ? stamps[stamps.length - 1].end : 0;
    
    const id = 'r_' + Math.random().toString(36).substr(2, 9);
    stamps.push({ id, ayah: stamps.length + 1, start: lastEnd, end: now });
    
    ws.addRegion({ 
        id,
        start: lastEnd, 
        end: now, 
        color: 'rgba(255, 77, 77, 0.4)', 
        drag: true, 
        resize: true 
    });
    
    renderTable();
}

function renderTable() {
    // 1. Render Table Rows
    let tableHtml = stamps.map(s => `<tr><td>${s.ayah}</td><td>${s.start}s</td><td>${s.end}s</td><td>${(s.end-s.start).toFixed(2)}s</td></tr>`).join('');
    if (ws && ws.getDuration() > 0) {
        let currentAyah = stamps.length + 1;
        let lastEnd = stamps.length > 0 ? stamps[stamps.length - 1].end : 0;
        tableHtml += `<tr style="opacity: 0.5; font-style: italic;"><td>${currentAyah}</td><td>${lastEnd}s</td><td>--</td><td>(In Progress)</td></tr>`;
    }
    markerBody.innerHTML = tableHtml;
    markerBody.scrollTop = markerBody.scrollHeight;

    // 2. Render Interactive Cards
    if (stamps.length === 0) {
        stampsList.innerHTML = '<div style="color: #666; font-size: 0.8rem; grid-column: 1/-1; text-align: center; padding: 20px;">No stamps yet. Press \'M\' to start mapping.</div>';
    } else {
        stampsList.innerHTML = stamps.map(s => `
            <div class="stamp-card" onclick="jumpToStamp(${s.start})">
                <div class="info">
                    <span class="num">Ayah ${s.ayah}</span>
                    <span>${s.start}s - ${s.end}s</span>
                </div>
                <div class="actions">
                    <button class="btn-mini btn-mini-play" onclick="event.stopPropagation(); jumpToStamp(${s.start})">▶</button>
                    <button class="btn-mini btn-mini-del" onclick="event.stopPropagation(); deleteStamp('${s.id}')">✕</button>
                </div>
            </div>
        `).join('');
    }
    stampsList.scrollTop = stampsList.scrollHeight;
}

function undo() {
    stamps.pop();
    ws.clearRegions();
    stamps.forEach(s => {
        ws.addRegion({
            id: s.id,
            start: s.start,
            end: s.end,
            color: 'rgba(255, 77, 77, 0.4)',
            drag: true,
            resize: true
        });
    });
    renderTable();
}

async function selectFolder() {
    try {
        directoryHandle = await window.showDirectoryPicker();
        folderStatus.innerText = "🚀 Target: " + directoryHandle.name;
        folderStatus.style.display = 'block';
    } catch (e) { console.error(e); }
}

async function saveJSON() {
    const sNum = surahNumInput.value.padStart(3, '0');
    const sTitle = surahTitleInput.value.trim().replace(/\s+/g, '-');
    const fileName = `${sNum}_${sTitle}.json`;
    
    let finalStamps = [...stamps];
    let duration = ws.getDuration();
    let lastEnd = finalStamps.length > 0 ? parseFloat(finalStamps[finalStamps.length - 1].end) : 0;

    if (duration > lastEnd + 0.1) {
        finalStamps.push({
            ayah: finalStamps.length + 1,
            start: lastEnd.toFixed(2),
            end: duration.toFixed(2)
        });
    }

    let output = {
        surah_number: parseInt(surahNumInput.value),
        surah_name: surahTitleInput.value,
        reciter: "Abdul Rashid Ali Sufi",
        riwayah: "Khalaf 'an Hamzah",
        data: finalStamps.map(s => ({ ayah: s.ayah, start: s.start, end: s.end }))
    };

    const jsonStr = JSON.stringify(output, null, 2);

    if (directoryHandle) {
        try {
            const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            statusDiv.innerText = "✅ Saved directly to " + directoryHandle.name;
        } catch (e) { downloadFallback(jsonStr, fileName); }
    } else {
        downloadFallback(jsonStr, fileName);
    }
}

function downloadFallback(content, name) {
    const blob = new Blob([content], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    statusDiv.innerText = "💾 Downloaded to browser folder.";
}

window.onkeydown = (e) => {
    if(document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    if(e.key.toLowerCase() === 'm') {
        if (e.repeat) return;
        markAyah();
    }
    if(e.code === 'Space') { e.preventDefault(); ws.playPause(); }
    if(e.key.toLowerCase() === 'z') undo();
    if(e.key.toLowerCase() === 's') saveJSON();
}
