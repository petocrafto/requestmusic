document.addEventListener('DOMContentLoaded', function() {
    // BASE_URL agar bisa diakses semua scope
    const BASE_URL = 'http://localhost:3000';
    
    // Inisialisasi data
    let songRequests = [];
    let schedule = { today: [], tomorrow: [] };
    let adminCredentials = {
        username: 'user1',
        password: '#111'
    };
    
    // Cek status login admin
    let isAdminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    
    // Set tanggal
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('today-date').textContent = formatDate(today);
    document.getElementById('tomorrow-date').textContent = formatDate(tomorrow);
    
    // Inisialisasi UI berdasarkan status login
    updateAdminUI();
    
    // Load data dari MongoDB
    loadData();
    
    // Tab functionality
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and content
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // YouTube search functionality
    document.getElementById('searchYoutube').addEventListener('click', searchYouTube);
    
    // Form submission
    document.getElementById('songRequestForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const senderName = document.getElementById('senderName').value;
        const recipient = document.getElementById('recipient').value;
        const songTitle = document.getElementById('songTitle').value;
        const youtubeLink = document.getElementById('youtubeLink').value;
        const message = document.getElementById('message').value;
        
        // Validasi input
        if (!senderName || !songTitle || !youtubeLink) {
            alert('Nama Pengirim, Judul Lagu, dan Link YouTube harus diisi!');
            return;
        }

        const newRequest = {
            senderName,
            recipient,
            songTitle,
            youtubeLink,
            message,
            status: 'queue'
        };
        
        try {
            // Data yang mau disimpan diambil dari form input:
            // - senderName: Nama pengirim (input id="senderName")
            // - recipient: Untuk siapa (input id="recipient")
            // - songTitle: Judul lagu (input id="songTitle")
            // - youtubeLink: Link YouTube (input id="youtubeLink")
            // - message: Pesan (textarea id="message")
            // Semua data ini dikumpulkan dalam objek newRequest di atas.

            // Kirim data newRequest ke server untuk disimpan di database
            console.log('Data yang akan disimpan:', newRequest);

            const response = await fetch(`${BASE_URL}/api/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newRequest)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to save request');
            }

            // Reset form setelah berhasil submit
            this.reset();
            document.getElementById('selectedLinkInfo').style.display = 'none';

            // Tampilkan pesan sukses
            alert('Request lagu berhasil dikirim!');

            // Refresh data tampilan
            await loadData();
        } catch (error) {
            console.error('Error:', error);
            alert(`Gagal mengirim request: ${error.message}. Silakan coba lagi.`);
        }
    });
    
    // Admin login button
    document.getElementById('adminLoginBtn').addEventListener('click', function() {
        document.getElementById('loginModal').classList.add('active');
    });
    
    // Login modal buttons
    document.querySelectorAll('#loginModal .close-modal, #cancelLoginBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('loginModal').classList.remove('active');
        });
    });
    
    // Confirm login
    document.getElementById('confirmLoginBtn').addEventListener('click', function() {
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        
        if (username === adminCredentials.username && password === adminCredentials.password) {
            isAdminLoggedIn = true;
            localStorage.setItem('adminLoggedIn', 'true');
            updateAdminUI();
            document.getElementById('loginModal').classList.remove('active');
            document.getElementById('loginForm').reset();
            alert('Login berhasil!');
        } else {
            alert('Username atau password salah!');
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        isAdminLoggedIn = false;
        localStorage.setItem('adminLoggedIn', 'false');
        updateAdminUI();
        alert('Anda telah logout');
    });
    
    // Reset data button
    document.getElementById('resetDataBtn').addEventListener('click', async function() {
        // Tampilkan modal konfirmasi reset
        document.getElementById('resetModal').classList.add('active');
    });

    // Modal reset: tombol batal
    document.getElementById('cancelResetBtn').addEventListener('click', function() {
        document.getElementById('resetModal').classList.remove('active');
    });

    // Modal reset: tombol konfirmasi
    document.getElementById('confirmResetBtn').addEventListener('click', async function() {
        try {
            const response = await fetch(`${BASE_URL}/api/requests`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to reset data');
            document.getElementById('resetModal').classList.remove('active');
            await loadData();
            alert('Semua data telah direset!');
        } catch (error) {
            console.error('Error:', error);
            alert('Gagal mereset data. Silakan coba lagi.');
        }
    });
    
    // Export data button
    document.getElementById('exportDataBtn').addEventListener('click', async function() {
        try {
            const response = await fetch(`${BASE_URL}/api/requests`);
            const data = await response.json();
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `song-requests-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('Data berhasil diexport!');
        } catch (error) {
            console.error('Error:', error);
            alert('Gagal mengeksport data. Silakan coba lagi.');
        }
    });
    
    // Fungsi untuk memuat data dari MongoDB
    async function loadData() {
        try {
            const [todayResponse, tomorrowResponse, queueResponse, allResponse] = await Promise.all([
                fetch(`${BASE_URL}/api/requests/today`),
                fetch(`${BASE_URL}/api/requests/tomorrow`),
                fetch(`${BASE_URL}/api/requests/queue`),
                fetch(`${BASE_URL}/api/requests`)
            ]);
            
            if (!todayResponse.ok || !tomorrowResponse.ok || !queueResponse.ok || !allResponse.ok) {
                throw new Error('Failed to load data');
            }
            
            const [todayData, tomorrowData, queueData, allData] = await Promise.all([
                todayResponse.json(),
                tomorrowResponse.json(),
                queueResponse.json(),
                allResponse.json()
            ]);
            
            schedule.today = todayData;
            schedule.tomorrow = tomorrowData;
            songRequests = allData;
            
            updateScheduleDisplay();
            updateAdminStats();
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Gagal memuat data: ' + (error && error.message ? error.message : error));
        }
    }
    
    // Fungsi untuk memperbarui tampilan jadwal
    function updateScheduleDisplay() {
        // Update today's songs
        const todaySongsList = document.getElementById('today-songs');
        todaySongsList.innerHTML = '';
        
        if (schedule.today.length > 0) {
            schedule.today.forEach(song => {
                todaySongsList.appendChild(createSongElement(song));
            });
        } else {
            todaySongsList.innerHTML = '<li class="empty-schedule">Belum ada lagu yang dijadwalkan untuk hari ini</li>';
        }
        
        // Update tomorrow's songs
        const tomorrowSongsList = document.getElementById('tomorrow-songs');
        tomorrowSongsList.innerHTML = '';
        
        if (schedule.tomorrow.length > 0) {
            schedule.tomorrow.forEach(song => {
                tomorrowSongsList.appendChild(createSongElement(song));
            });
        } else {
            tomorrowSongsList.innerHTML = '<li class="empty-schedule">Belum ada lagu yang dijadwalkan untuk besok</li>';
        }
        
        // Update queue songs
        const queueSongsList = document.getElementById('queue-songs');
        queueSongsList.innerHTML = '';
        
        const queueSongs = songRequests.filter(song => song.status === 'queue');
        
        if (queueSongs.length > 0) {
            queueSongs.forEach(song => {
                queueSongsList.appendChild(createSongElement(song));
            });
        } else {
            queueSongsList.innerHTML = '<li class="empty-schedule">Tidak ada lagu dalam antrian</li>';
        }
        
        // Update history songs
        const historySongsList = document.getElementById('history-songs');
        historySongsList.innerHTML = '';
        
        if (songRequests.length > 0) {
            songRequests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            songRequests.forEach(song => {
                const li = document.createElement('li');
                li.className = 'song-item';
                li.innerHTML = `
                    <div class="song-title">${song.songTitle}</div>
                    <div class="song-details">
                        <span>Dari: ${song.senderName}</span> | 
                        <span>Untuk: ${song.recipient}</span> |
                        <span>${formatDate(new Date(song.timestamp))}</span>
                    </div>
                    <div class="song-link">
                        <a href="${song.youtubeLink}" target="_blank">${song.youtubeLink}</a>
                    </div>
                    ${song.message ? `<div class="song-message">"${song.message}"</div>` : ''}
                `;
                historySongsList.appendChild(li);
            });
        } else {
            historySongsList.innerHTML = '<li class="empty-schedule">Belum ada history request</li>';
        }
    }
    
    // Fungsi untuk membuat elemen lagu
    function createSongElement(song) {
        const li = document.createElement('li');
        li.className = 'song-item';
        li.innerHTML = `
            <div class="song-title">${song.songTitle}</div>
            <div class="song-details">
                <span>Dari: ${song.senderName}</span> | 
                <span>Untuk: ${song.recipient}</span>
            </div>
            <div class="song-link">
                <a href="${song.youtubeLink}" target="_blank">${song.youtubeLink}</a>
            </div>
            ${song.message ? `<div class="song-message">"${song.message}"</div>` : ''}
        `;
        return li;
    }
    
    // Fungsi untuk mencari di YouTube
    function searchYouTube() {
        const query = document.getElementById('songTitle').value;
        if (!query) {
            alert('Masukkan judul lagu terlebih dahulu');
            return;
        }
        
        const resultsContainer = document.getElementById('youtubeResults');
        resultsContainer.innerHTML = '<div class="search-result">Mencari...</div>';
        resultsContainer.style.display = 'block';
        
        // Hapus info link yang dipilih sebelumnya
        document.getElementById('selectedLinkInfo').style.display = 'none';
        
        const API_KEY = 'AIzaSyDEJl6l3Cs4PCVe_c4mSncAVrHibtJolCw';
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&type=video&q=${encodeURIComponent(query)}&key=${API_KEY}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.items && data.items.length > 0) {
                    resultsContainer.innerHTML = '';
                    data.items.forEach(item => {
                        const result = document.createElement('div');
                        result.className = 'search-result';
                        result.innerHTML = `
                            <div class="video-title">${item.snippet.title}</div>
                            <div class="video-channel">Channel: ${item.snippet.channelTitle}</div>
                            <div class="video-thumbnail">
                                <img src="https://img.youtube.com/vi/${item.id.videoId}/default.jpg" alt="Thumbnail">
                            </div>
                        `;
                        result.addEventListener('click', () => {
                            const youtubeLink = `https://www.youtube.com/watch?v=${item.id.videoId}`;
                            document.getElementById('youtubeLink').value = youtubeLink;
                            
                            // Tampilkan info link yang dipilih
                            const selectedLinkInfo = document.getElementById('selectedLinkInfo');
                            document.getElementById('selectedLinkText').textContent = youtubeLink;
                            selectedLinkInfo.style.display = 'block';
                            
                            resultsContainer.style.display = 'none';
                        });
                        resultsContainer.appendChild(result);
                    });
                } else {
                    resultsContainer.innerHTML = '<div class="search-result">Tidak ditemukan hasil</div>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                resultsContainer.innerHTML = '<div class="search-result">Gagal melakukan pencarian</div>';
            });
    }
    
    // Fungsi untuk memformat tanggal
    function formatDate(date) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('id-ID', options);
    }
    
    // Fungsi untuk update UI admin
    function updateAdminUI() {
        const adminPanel = document.getElementById('adminPanel');
        if (isAdminLoggedIn) {
            adminPanel.classList.add('active');
            document.getElementById('adminLoginBtn').style.display = 'none';
        } else {
            adminPanel.classList.remove('active');
            document.getElementById('adminLoginBtn').style.display = 'block';
        }
    }
    
    // Fungsi untuk update statistik admin
    function updateAdminStats() {
        const queueSongs = songRequests.filter(song => song.status === 'queue');
        
        document.getElementById('totalRequests').textContent = songRequests.length;
        document.getElementById('todaySongsCount').textContent = `${schedule.today.length}/6`;
        document.getElementById('tomorrowSongsCount').textContent = schedule.tomorrow.length;
        document.getElementById('queueSongsCount').textContent = queueSongs.length;
    }
    
    // Sembunyikan hasil pencarian saat klik di luar
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container')) {
            document.getElementById('youtubeResults').style.display = 'none';
        }
    });
});
