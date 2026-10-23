/**
 * WhoSaid V2 — UI/UX Pro Max Studio Client
 * Offline CPU Video Transcription, Diarization & Speaker Captions
 */

(function () {
    'use strict';

    // --- State ---
    const state = {
        currentJobId: null,
        currentTranscriptId: null,
        transcript: null,
        duration: 0,
        currentTime: 0,
        activeTurnId: null,
        speakerFilter: 'all',
        isUserScrolling: false,
        userScrollTimeout: null,
        ws: null,
        theme: localStorage.getItem('whosaid_theme') || 'dark',
        swatchColors: [
            '#fb7185', '#2dd4bf', '#fbbf24', '#c084fc', '#4ade80',
            '#f472b6', '#38bdf8', '#f97316', '#a3e635', '#818cf8'
        ]
    };

    // --- DOM Elements ---
    const el = {
        // Nav & Header
        btnLogo: document.getElementById('btnLogo'),
        headerFileInfo: document.getElementById('headerFileInfo'),
        headerFileName: document.getElementById('headerFileName'),
        headerFileDuration: document.getElementById('headerFileDuration'),
        btnTryDemo: document.getElementById('btnTryDemo'),
        btnOpenHistory: document.getElementById('btnOpenHistory'),
        btnOpenProfiles: document.getElementById('btnOpenProfiles'),
        btnNewUpload: document.getElementById('btnNewUpload'),
        btnThemeToggle: document.getElementById('btnThemeToggle'),
        themeIconSun: document.getElementById('themeIconSun'),
        themeIconMoon: document.getElementById('themeIconMoon'),
        historyCountBadge: document.getElementById('historyCountBadge'),
        profilesCountBadge: document.getElementById('profilesCountBadge'),

        // Sections
        uploadSection: document.getElementById('uploadSection'),
        processingSection: document.getElementById('processingSection'),
        studioSection: document.getElementById('studioSection'),

        // Upload Form
        dropZone: document.getElementById('dropZone'),
        fileInput: document.getElementById('fileInput'),
        modelSelect: document.getElementById('modelSelect'),
        langSelect: document.getElementById('langSelect'),
        btnHeroDemo: document.getElementById('btnHeroDemo'),

        // Processing Pipeline
        procTitle: document.getElementById('procTitle'),
        procMessage: document.getElementById('procMessage'),
        procProgressBar: document.getElementById('procProgressBar'),
        procPercent: document.getElementById('procPercent'),
        stageAudio: document.getElementById('stageAudio'),
        stageDiar: document.getElementById('stageDiar'),
        stageTrans: document.getElementById('stageTrans'),
        stageAlign: document.getElementById('stageAlign'),

        // Player & Controls
        mediaFrame: document.getElementById('mediaFrame'),
        mediaVideo: document.getElementById('mediaVideo'),
        mediaAudio: document.getElementById('mediaAudio'),
        captionOverlay: document.getElementById('captionOverlay'),
        captionSpeakerBadge: document.getElementById('captionSpeakerBadge'),
        captionText: document.getElementById('captionText'),
        playerProgressBar: document.getElementById('playerProgressBar'),
        playerProgressFill: document.getElementById('playerProgressFill'),
        btnPlayPause: document.getElementById('btnPlayPause'),
        iconPlay: document.getElementById('iconPlay'),
        iconPause: document.getElementById('iconPause'),
        btnSkipBack: document.getElementById('btnSkipBack'),
        btnSkipForward: document.getElementById('btnSkipForward'),
        timeDisplay: document.getElementById('timeDisplay'),
        btnMuteToggle: document.getElementById('btnMuteToggle'),
        iconVolume: document.getElementById('iconVolume'),
        volumeSlider: document.getElementById('volumeSlider'),
        speedSelect: document.getElementById('speedSelect'),
        btnFullscreen: document.getElementById('btnFullscreen'),

        // Waveform
        waveformWrapper: document.getElementById('waveformWrapper'),
        waveformCanvas: document.getElementById('waveformCanvas'),
        waveformSpeakerRegions: document.getElementById('waveformSpeakerRegions'),
        waveformScrubber: document.getElementById('waveformScrubber'),
        waveformHoverTooltip: document.getElementById('waveformHoverTooltip'),

        // Speakers & Export
        speakersList: document.getElementById('speakersList'),
        btnOpenMergeModal: document.getElementById('btnOpenMergeModal'),
        exportButtons: document.querySelectorAll('.btn-export'),

        // Transcript
        turnCountBadge: document.getElementById('turnCountBadge'),
        speakerFilterSelect: document.getElementById('speakerFilterSelect'),
        transcriptSearch: document.getElementById('transcriptSearch'),
        btnCopyAll: document.getElementById('btnCopyAll'),
        transcriptTurnsList: document.getElementById('transcriptTurnsList'),

        // Rename Modal
        renameModal: document.getElementById('renameModal'),
        renameSpeakerId: document.getElementById('renameSpeakerId'),
        renameInput: document.getElementById('renameInput'),
        colorSwatches: document.getElementById('colorSwatches'),
        enrollVoiceCheck: document.getElementById('enrollVoiceCheck'),
        btnCloseRenameModal: document.getElementById('btnCloseRenameModal'),
        btnCancelRename: document.getElementById('btnCancelRename'),
        btnSaveRename: document.getElementById('btnSaveRename'),

        // Merge Modal
        mergeModal: document.getElementById('mergeModal'),
        mergeSourceSelect: document.getElementById('mergeSourceSelect'),
        mergeTargetSelect: document.getElementById('mergeTargetSelect'),
        btnCloseMergeModal: document.getElementById('btnCloseMergeModal'),
        btnCancelMerge: document.getElementById('btnCancelMerge'),
        btnConfirmMerge: document.getElementById('btnConfirmMerge'),

        // Profiles Modal
        profilesModal: document.getElementById('profilesModal'),
        profilesListContainer: document.getElementById('profilesListContainer'),
        btnCloseProfilesModal: document.getElementById('btnCloseProfilesModal'),
        btnCloseProfiles: document.getElementById('btnCloseProfiles'),

        // History Modal
        historyModal: document.getElementById('historyModal'),
        historyListContainer: document.getElementById('historyListContainer'),
        btnCloseHistoryModal: document.getElementById('btnCloseHistoryModal'),
        btnCloseHistory: document.getElementById('btnCloseHistory'),

        // Toast Container
        toastContainer: document.getElementById('toastContainer')
    };

    function activePlayer() {
        return (el.mediaVideo && !el.mediaVideo.classList.contains('hidden')) ? el.mediaVideo : el.mediaAudio;
    }

    // --- Helpers ---
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span>✓</span><span>${escapeHtml(message)}</span>`;
        el.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
            toast.style.transition = 'all 200ms ease';
            setTimeout(() => toast.remove(), 200);
        }, 2600);
    }

    // --- View Switching ---
    function showSection(name) {
        el.uploadSection.classList.add('hidden');
        el.processingSection.classList.add('hidden');
        el.studioSection.classList.add('hidden');

        if (name === 'upload') {
            el.uploadSection.classList.remove('hidden');
            el.headerFileInfo.classList.add('hidden');
        } else if (name === 'processing') {
            el.processingSection.classList.remove('hidden');
        } else if (name === 'studio') {
            el.studioSection.classList.remove('hidden');
            el.headerFileInfo.classList.remove('hidden');
        }
    }

    // --- Theme Controller ---
    function initTheme() {
        applyTheme(state.theme);
        el.btnThemeToggle.addEventListener('click', () => {
            const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
        });
    }

    function applyTheme(theme) {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('whosaid_theme', theme);
        if (theme === 'dark') {
            el.themeIconSun.classList.remove('hidden');
            el.themeIconMoon.classList.add('hidden');
        } else {
            el.themeIconSun.classList.add('hidden');
            el.themeIconMoon.classList.remove('hidden');
        }
        if (state.transcript && state.transcript.peaks) {
            drawWaveform(state.transcript.peaks);
        }
    }

    // --- Ingestion & Uploads ---
    function initUpload() {
        el.dropZone.addEventListener('click', () => el.fileInput.click());

        el.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            el.dropZone.classList.add('drag-active');
        });

        el.dropZone.addEventListener('dragleave', () => {
            el.dropZone.classList.remove('drag-active');
        });

        el.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            el.dropZone.classList.remove('drag-active');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                uploadMediaFile(e.dataTransfer.files[0]);
            }
        });

        el.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                uploadMediaFile(e.target.files[0]);
            }
        });

        el.btnHeroDemo.addEventListener('click', launchDemoSession);
        el.btnTryDemo.addEventListener('click', launchDemoSession);
        el.btnNewUpload.addEventListener('click', () => showSection('upload'));
        el.btnLogo.addEventListener('click', () => showSection('upload'));
    }

    async function launchDemoSession() {
        const modelSize = el.modelSelect.value || 'base';
        showSection('processing');
        updatePipelineUI(10, 'Initializing Demo Session...', 'starting');

        try {
            const formData = new FormData();
            formData.append('model_size', modelSize);

            const res = await fetch('/api/demo', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.cached && data.transcript_id) {
                await loadTranscript(data.transcript_id);
            } else if (data.job_id) {
                subscribeJobProgress(data.job_id);
            }
        } catch (err) {
            alert('Failed to launch demo: ' + err.message);
            showSection('upload');
        }
    }

    async function uploadMediaFile(file) {
        showSection('processing');
        updatePipelineUI(5, `Uploading ${file.name}...`, 'uploading');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('model_size', el.modelSelect.value);
        formData.append('language_mode', el.langSelect.value);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Upload failed');
            }

            const data = await res.json();
            if (data.cached && data.transcript_id) {
                await loadTranscript(data.transcript_id);
            } else if (data.job_id) {
                subscribeJobProgress(data.job_id);
            }
        } catch (err) {
            alert('Error: ' + err.message);
            showSection('upload');
        }
    }

    function subscribeJobProgress(jobId) {
        state.currentJobId = jobId;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws/${jobId}`;

        if (state.ws) {
            try { state.ws.close(); } catch (e) {}
        }

        const ws = new WebSocket(wsUrl);
        state.ws = ws;

        ws.onmessage = async (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.progress !== undefined) {
                    updatePipelineUI(msg.progress, msg.message, msg.status);
                }
                if (msg.status === 'completed') {
                    ws.close();
                    const jobRes = await fetch(`/api/jobs/${jobId}`);
                    const jobData = await jobRes.json();
                    if (jobData.transcript_id) {
                        await loadTranscript(jobData.transcript_id);
                    }
                } else if (msg.status === 'failed') {
                    ws.close();
                    alert(`Processing failed: ${msg.message}`);
                    showSection('upload');
                }
            } catch (e) {
                console.error('WS parse error', e);
            }
        };

        ws.onerror = () => pollJobFallback(jobId);
    }

    async function pollJobFallback(jobId) {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/jobs/${jobId}`);
                const data = await res.json();
                updatePipelineUI(data.progress, data.message, data.status);
                if (data.status === 'completed' && data.transcript_id) {
                    clearInterval(interval);
                    await loadTranscript(data.transcript_id);
                } else if (data.status === 'failed') {
                    clearInterval(interval);
                    alert(`Job failed: ${data.message}`);
                    showSection('upload');
                }
            } catch (e) {
                clearInterval(interval);
            }
        }, 1500);
    }

    function updatePipelineUI(pct, msg, status) {
        const rounded = Math.round(pct);
        el.procProgressBar.style.width = `${Math.min(100, Math.max(5, rounded))}%`;
        el.procPercent.textContent = `${rounded}%`;
        el.procMessage.textContent = msg || 'Processing...';

        el.stageAudio.className = 'stage-item';
        el.stageDiar.className = 'stage-item';
        el.stageTrans.className = 'stage-item';
        el.stageAlign.className = 'stage-item';

        if (status === 'extracting') {
            el.stageAudio.classList.add('active');
        } else if (status === 'analyzing' || status === 'diarizing') {
            el.stageAudio.classList.add('completed');
            el.stageDiar.classList.add('active');
        } else if (status === 'transcribing') {
            el.stageAudio.classList.add('completed');
            el.stageDiar.classList.add('completed');
            el.stageTrans.classList.add('active');
        } else if (status === 'aligning') {
            el.stageAudio.classList.add('completed');
            el.stageDiar.classList.add('completed');
            el.stageTrans.classList.add('completed');
            el.stageAlign.classList.add('active');
        } else if (status === 'completed') {
            el.stageAudio.classList.add('completed');
            el.stageDiar.classList.add('completed');
            el.stageTrans.classList.add('completed');
            el.stageAlign.classList.add('completed');
        }
    }

    // --- Load Transcript & Render Studio ---
    async function loadTranscript(transcriptId) {
        try {
            const res = await fetch(`/api/transcripts/${transcriptId}`);
            if (!res.ok) throw new Error('Failed to load transcript data');
            const data = await res.json();

            state.currentTranscriptId = transcriptId;
            state.currentJobId = data.job_id;
            state.transcript = data;
            state.duration = data.duration || 0;

            showSection('studio');
            renderStudio(data);
            refreshCounts();
        } catch (err) {
            alert('Error loading transcript: ' + err.message);
            showSection('upload');
        }
    }

    function renderStudio(data) {
        el.headerFileName.textContent = data.filename || 'media';
        el.headerFileDuration.textContent = formatTime(data.duration);
        el.turnCountBadge.textContent = `${(data.segments || []).length} turns`;

        setupPlayer(data);

        requestAnimationFrame(() => {
            if (data.peaks && data.peaks.length > 0) {
                drawWaveform(data.peaks);
            } else {
                clearWaveform();
            }
        });

        renderSpeakerTimelineRegions(data.segments, data.duration);
        renderSpeakerChips(data.speakers, data.segments);
        renderSpeakerFilterOptions(data.speakers);
        renderTranscriptTurns(data.segments);
    }

    function setupPlayer(data) {
        const isAudioOnly = (data.filename || '').match(/\.(mp3|wav|flac|ogg)$/i);
        const player = activePlayer();
        player.pause();

        const mediaUrl = data.media_url || `/api/media/${data.job_id}`;

        if (isAudioOnly) {
            el.mediaVideo.classList.add('hidden');
            el.mediaAudio.classList.remove('hidden');
            el.mediaAudio.src = mediaUrl;
        } else {
            el.mediaAudio.classList.add('hidden');
            el.mediaVideo.classList.remove('hidden');
            el.mediaVideo.src = mediaUrl;
        }

        const target = activePlayer();
        target.currentTime = 0;
        target.playbackRate = parseFloat(el.speedSelect.value || '1.0');
        target.volume = parseFloat(el.volumeSlider.value || '1.0');

        target.onloadedmetadata = () => {
            if (target.duration && !state.duration) {
                state.duration = target.duration;
                el.headerFileDuration.textContent = formatTime(target.duration);
            }
            updateTimeDisplay();
        };

        target.ontimeupdate = handleTimeUpdate;
        target.onplay = () => {
            el.iconPlay.classList.add('hidden');
            el.iconPause.classList.remove('hidden');
        };
        target.onpause = () => {
            el.iconPlay.classList.remove('hidden');
            el.iconPause.classList.add('hidden');
        };
    }

    // --- Waveform Rendering (UI/UX Pro Max Dual Mirrored) ---
    function drawWaveform(peaks) {
        const canvas = el.waveformCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        const width = rect.width || canvas.parentElement.clientWidth || 500;
        const height = rect.height || 60;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, height);

        const isDark = state.theme === 'dark';
        const total = peaks.length;
        const barWidth = Math.max(1.8, (width / total) - 0.6);
        const centerY = height / 2;

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        if (isDark) {
            grad.addColorStop(0, '#818cf8');
            grad.addColorStop(0.5, '#6366f1');
            grad.addColorStop(1, '#a855f7');
        } else {
            grad.addColorStop(0, '#6366f1');
            grad.addColorStop(0.5, '#4f46e5');
            grad.addColorStop(1, '#7c3aed');
        }

        ctx.fillStyle = grad;

        for (let i = 0; i < total; i++) {
            const x = (i / total) * width;
            const normalized = Math.min(1.0, Math.max(0.04, peaks[i]));
            const barHeight = normalized * (height * 0.88);
            const topY = centerY - (barHeight / 2);

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(x, topY, barWidth, barHeight, [2]);
            } else {
                ctx.rect(x, topY, barWidth, barHeight);
            }
            ctx.fill();
        }

        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
    }

    function clearWaveform() {
        const canvas = el.waveformCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function renderSpeakerTimelineRegions(segments, totalDuration) {
        el.waveformSpeakerRegions.innerHTML = '';
        if (!totalDuration || totalDuration <= 0 || !segments) return;

        segments.forEach((seg) => {
            const leftPct = (seg.start / totalDuration) * 100;
            const widthPct = Math.max(0.4, ((seg.end - seg.start) / totalDuration) * 100);

            const div = document.createElement('div');
            div.className = 'speaker-region-segment';
            div.style.left = `${leftPct}%`;
            div.style.width = `${widthPct}%`;
            div.style.backgroundColor = seg.speaker_color || '#6366f1';
            div.title = `${seg.speaker_label} (${formatTime(seg.start)} - ${formatTime(seg.end)})`;
            el.waveformSpeakerRegions.appendChild(div);
        });
    }

    // --- Time Update & Playback Sync ---
    function handleTimeUpdate() {
        const player = activePlayer();
        const current = player.currentTime;
        state.currentTime = current;
        updateTimeDisplay();

        if (state.duration > 0) {
            const pct = Math.min(100, Math.max(0, (current / state.duration) * 100));
            el.playerProgressFill.style.width = `${pct}%`;
            el.waveformScrubber.style.left = `${pct}%`;
        }

        syncActiveTranscript(current);
    }

    function updateTimeDisplay() {
        const player = activePlayer();
        const cur = player.currentTime || 0;
        const dur = state.duration || player.duration || 0;
        el.timeDisplay.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
    }

    function syncActiveTranscript(currentTime) {
        if (!state.transcript || !state.transcript.segments) return;
        const segments = state.transcript.segments;

        let activeTurn = null;
        for (let i = 0; i < segments.length; i++) {
            if (currentTime >= segments[i].start - 0.2 && currentTime <= segments[i].end + 0.2) {
                activeTurn = segments[i];
                break;
            }
        }

        // 1. Floating Caption Overlay Update
        if (activeTurn) {
            el.captionOverlay.classList.remove('hidden');
            el.captionSpeakerBadge.textContent = activeTurn.speaker_label;
            el.captionSpeakerBadge.style.backgroundColor = activeTurn.speaker_color || '#6366f1';
            el.captionText.textContent = activeTurn.text;
        } else {
            el.captionOverlay.classList.add('hidden');
        }

        // 2. Transcript Turns Highlighting & Gentle Auto-Scroll
        if (activeTurn && activeTurn.id !== state.activeTurnId) {
            state.activeTurnId = activeTurn.id;

            const prev = el.transcriptTurnsList.querySelector('.turn-card.active-turn');
            if (prev) prev.classList.remove('active-turn');

            const currentTurnEl = document.getElementById(activeTurn.id);
            if (currentTurnEl) {
                currentTurnEl.classList.add('active-turn');
                if (!state.isUserScrolling) {
                    currentTurnEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }

        // 3. Word-level Highlighting
        if (activeTurn && activeTurn.words) {
            const currentTurnEl = document.getElementById(activeTurn.id);
            if (currentTurnEl) {
                const words = currentTurnEl.querySelectorAll('.transcript-word');
                words.forEach((wEl) => {
                    const wStart = parseFloat(wEl.getAttribute('data-start'));
                    const wEnd = parseFloat(wEl.getAttribute('data-end'));
                    if (currentTime >= wStart && currentTime <= wEnd) {
                        wEl.classList.add('active-word');
                    } else {
                        wEl.classList.remove('active-word');
                    }
                });
            }
        }
    }

    // --- Render Speakers & Filter Options ---
    function renderSpeakerChips(speakers, segments) {
        el.speakersList.innerHTML = '';
        if (!speakers || speakers.length === 0) return;

        const durationMap = {};
        if (segments) {
            segments.forEach(s => {
                const dur = (s.end - s.start);
                durationMap[s.speaker_id] = (durationMap[s.speaker_id] || 0) + dur;
            });
        }

        speakers.forEach(spk => {
            const chip = document.createElement('div');
            chip.className = 'speaker-chip';
            const spokenDur = Math.round(durationMap[spk.id] || 0);

            chip.innerHTML = `
                <span class="chip-color-dot" style="background-color: ${spk.color}; color: ${spk.color}"></span>
                <span class="chip-label">${escapeHtml(spk.label)}</span>
                <span class="chip-meta">${spokenDur}s</span>
            `;

            chip.addEventListener('click', () => openRenameModal(spk));
            el.speakersList.appendChild(chip);
        });
    }

    function renderSpeakerFilterOptions(speakers) {
        el.speakerFilterSelect.innerHTML = '<option value="all">All Speakers</option>';
        if (!speakers) return;
        speakers.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.label;
            el.speakerFilterSelect.appendChild(opt);
        });
    }

    // --- Render Dialogue Turns ---
    function renderTranscriptTurns(segments) {
        el.transcriptTurnsList.innerHTML = '';
        if (!segments || segments.length === 0) {
            el.transcriptTurnsList.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center;">
                    <p class="text-secondary">No speech detected in this media file.</p>
                </div>
            `;
            return;
        }

        segments.forEach((turn) => {
            const card = document.createElement('div');
            card.className = 'turn-card';
            card.id = turn.id;
            card.setAttribute('data-speaker-id', turn.speaker_id);

            const initial = (turn.speaker_label || 'S').charAt(0).toUpperCase();

            let wordsHtml = '';
            if (turn.words && turn.words.length > 0) {
                wordsHtml = turn.words.map((w, idx) => {
                    return `<span class="transcript-word" data-start="${w.start}" data-end="${w.end}" data-idx="${idx}" title="Seek to ${formatTime(w.start)}">${escapeHtml(w.word)}</span>`;
                }).join(' ');
            } else {
                wordsHtml = escapeHtml(turn.text);
            }

            card.innerHTML = `
                <div class="turn-header">
                    <div class="turn-speaker-badge" data-speaker-id="${turn.speaker_id}" title="Click to rename speaker">
                        <div class="turn-avatar" style="background-color: ${turn.speaker_color || '#6366f1'}">${initial}</div>
                        <span class="turn-speaker-name">${escapeHtml(turn.speaker_label)}</span>
                    </div>
                    <div class="turn-actions">
                        <span class="turn-time-link" data-start="${turn.start}" title="Jump to timestamp">${formatTime(turn.start)} - ${formatTime(turn.end)}</span>
                        <button class="turn-copy-btn" title="Copy dialogue line">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-xs">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="turn-text-content" contenteditable="true" spellcheck="false" data-turn-id="${turn.id}" title="Click to edit transcription">
                    ${wordsHtml}
                </div>
            `;

            const timeLink = card.querySelector('.turn-time-link');
            timeLink.addEventListener('click', () => seekTo(turn.start));

            const copyBtn = card.querySelector('.turn-copy-btn');
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(`[${turn.speaker_label}] ${turn.text}`);
                showToast(`Copied turn by ${turn.speaker_label}`);
            });

            const spkBadge = card.querySelector('.turn-speaker-badge');
            spkBadge.addEventListener('click', () => {
                const spk = state.transcript.speakers.find(s => s.id === turn.speaker_id);
                if (spk) openRenameModal(spk);
            });

            card.querySelectorAll('.transcript-word').forEach(wEl => {
                wEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const wStart = parseFloat(wEl.getAttribute('data-start'));
                    seekTo(wStart);
                });
            });

            const textContent = card.querySelector('.turn-text-content');
            textContent.addEventListener('blur', () => {
                saveInlineEdit(turn.id, textContent.innerText.trim());
            });

            textContent.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    textContent.blur();
                }
            });

            el.transcriptTurnsList.appendChild(card);
        });

        // Detect user manual scroll to avoid disruptive auto-scrolling
        el.transcriptTurnsList.addEventListener('wheel', () => {
            state.isUserScrolling = true;
            clearTimeout(state.userScrollTimeout);
            state.userScrollTimeout = setTimeout(() => {
                state.isUserScrolling = false;
            }, 3000);
        });
    }

    function seekTo(seconds) {
        const player = activePlayer();
        player.currentTime = Math.max(0, Math.min(seconds, state.duration || 99999));
        if (player.paused) {
            player.play();
        }
    }

    // --- Inline Transcript Editing ---
    async function saveInlineEdit(turnId, newText) {
        if (!state.transcript || !state.transcript.segments) return;
        const turn = state.transcript.segments.find(s => s.id === turnId);
        if (!turn || turn.text === newText) return;

        turn.text = newText;

        try {
            await fetch(`/api/transcripts/${state.currentTranscriptId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    speakers: state.transcript.speakers,
                    segments: state.transcript.segments
                })
            });
            showToast('Transcript edit saved');
        } catch (err) {
            console.error('Error saving transcript edit:', err);
        }
    }

    // --- Search & Filters ---
    function initFilters() {
        function applyFilter() {
            const query = el.transcriptSearch.value.toLowerCase().trim();
            const filterSpk = el.speakerFilterSelect.value;
            const cards = el.transcriptTurnsList.querySelectorAll('.turn-card');

            cards.forEach(card => {
                const text = card.querySelector('.turn-text-content').textContent.toLowerCase();
                const spkId = card.getAttribute('data-speaker-id');
                const spkName = card.querySelector('.turn-speaker-name').textContent.toLowerCase();

                const matchesQuery = !query || text.includes(query) || spkName.includes(query);
                const matchesSpeaker = filterSpk === 'all' || spkId === filterSpk;

                if (matchesQuery && matchesSpeaker) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        el.transcriptSearch.addEventListener('input', applyFilter);
        el.speakerFilterSelect.addEventListener('change', applyFilter);

        el.btnCopyAll.addEventListener('click', () => {
            if (!state.transcript || !state.transcript.segments) return;
            const fullText = state.transcript.segments.map(s => {
                return `[${s.speaker_label}] (${formatTime(s.start)} - ${formatTime(s.end)})\n${s.text}\n`;
            }).join('\n');
            navigator.clipboard.writeText(fullText);
            showToast('Full transcript copied to clipboard!');
        });
    }

    // --- Waveform Interaction & Tooltip ---
    function initWaveform() {
        el.waveformWrapper.addEventListener('click', (e) => {
            const rect = el.waveformWrapper.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const fraction = Math.max(0, Math.min(1, clickX / rect.width));
            if (state.duration > 0) {
                seekTo(fraction * state.duration);
            }
        });

        el.waveformWrapper.addEventListener('mousemove', (e) => {
            const rect = el.waveformWrapper.getBoundingClientRect();
            const hoverX = e.clientX - rect.left;
            const fraction = Math.max(0, Math.min(1, hoverX / rect.width));
            if (state.duration > 0) {
                const hoverTime = fraction * state.duration;
                el.waveformHoverTooltip.textContent = formatTime(hoverTime);
                el.waveformHoverTooltip.style.left = `${hoverX}px`;
                el.waveformHoverTooltip.classList.remove('hidden');
            }
        });

        el.waveformWrapper.addEventListener('mouseleave', () => {
            el.waveformHoverTooltip.classList.add('hidden');
        });

        el.playerProgressBar.addEventListener('click', (e) => {
            const rect = el.playerProgressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const fraction = Math.max(0, Math.min(1, clickX / rect.width));
            if (state.duration > 0) {
                seekTo(fraction * state.duration);
            }
        });

        window.addEventListener('resize', () => {
            if (state.transcript && state.transcript.peaks) {
                drawWaveform(state.transcript.peaks);
            }
        });
    }

    // --- Player Controls Event Handlers ---
    function initPlayerControls() {
        el.btnPlayPause.addEventListener('click', () => {
            const p = activePlayer();
            if (p.paused) {
                p.play();
            } else {
                p.pause();
            }
        });

        el.btnSkipBack.addEventListener('click', () => {
            const p = activePlayer();
            p.currentTime = Math.max(0, p.currentTime - 5);
        });

        el.btnSkipForward.addEventListener('click', () => {
            const p = activePlayer();
            p.currentTime = Math.min(state.duration || 99999, p.currentTime + 5);
        });

        el.speedSelect.addEventListener('change', (e) => {
            activePlayer().playbackRate = parseFloat(e.target.value);
        });

        // Volume & Mute
        el.volumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            activePlayer().volume = val;
            activePlayer().muted = (val === 0);
        });

        el.btnMuteToggle.addEventListener('click', () => {
            const p = activePlayer();
            p.muted = !p.muted;
            el.volumeSlider.value = p.muted ? 0 : p.volume;
            showToast(p.muted ? 'Muted' : 'Unmuted');
        });

        // Fullscreen
        el.btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                el.mediaFrame.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
            if (e.code === 'Space') {
                e.preventDefault();
                el.btnPlayPause.click();
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                el.btnSkipBack.click();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                el.btnSkipForward.click();
            } else if (e.code === 'KeyM') {
                e.preventDefault();
                el.btnMuteToggle.click();
            } else if (e.code === 'KeyF') {
                e.preventDefault();
                el.btnFullscreen.click();
            } else if (e.code === 'Escape') {
                closeAllModals();
            }
        });
    }

    function closeAllModals() {
        el.renameModal.classList.add('hidden');
        el.mergeModal.classList.add('hidden');
        el.profilesModal.classList.add('hidden');
        el.historyModal.classList.add('hidden');
    }

    // --- Speaker Rename Modal ---
    let selectedSwatchColor = '#fb7185';

    function initRenameModal() {
        el.colorSwatches.innerHTML = '';
        state.swatchColors.forEach(color => {
            const dot = document.createElement('div');
            dot.className = 'color-swatch';
            dot.style.backgroundColor = color;
            dot.addEventListener('click', () => {
                el.colorSwatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                dot.classList.add('active');
                selectedSwatchColor = color;
            });
            el.colorSwatches.appendChild(dot);
        });

        el.btnCloseRenameModal.addEventListener('click', () => el.renameModal.classList.add('hidden'));
        el.btnCancelRename.addEventListener('click', () => el.renameModal.classList.add('hidden'));

        el.btnSaveRename.addEventListener('click', async () => {
            const speakerId = el.renameSpeakerId.value;
            const newLabel = el.renameInput.value.trim();
            const enrollProfile = el.enrollVoiceCheck.checked;

            if (!newLabel) {
                alert('Please enter a speaker name');
                return;
            }

            try {
                const res = await fetch(`/api/transcripts/${state.currentTranscriptId}/rename-speaker`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        speaker_id: speakerId,
                        new_label: newLabel,
                        color: selectedSwatchColor,
                        enroll_profile: enrollProfile
                    })
                });

                if (!res.ok) throw new Error('Failed to rename speaker');
                el.renameModal.classList.add('hidden');
                showToast(`Renamed to "${newLabel}"`);
                await loadTranscript(state.currentTranscriptId);
            } catch (err) {
                alert('Error renaming speaker: ' + err.message);
            }
        });
    }

    function openRenameModal(speaker) {
        el.renameSpeakerId.value = speaker.id;
        el.renameInput.value = speaker.label;
        selectedSwatchColor = speaker.color || state.swatchColors[0];

        el.colorSwatches.querySelectorAll('.color-swatch').forEach(dot => {
            dot.classList.toggle('active', dot.style.backgroundColor === selectedSwatchColor);
        });

        el.enrollVoiceCheck.checked = false;
        el.renameModal.classList.remove('hidden');
        el.renameInput.focus();
    }

    // --- Speaker Merge Modal ---
    function initMergeModal() {
        el.btnOpenMergeModal.addEventListener('click', openMergeModal);
        el.btnCloseMergeModal.addEventListener('click', () => el.mergeModal.classList.add('hidden'));
        el.btnCancelMerge.addEventListener('click', () => el.mergeModal.classList.add('hidden'));

        el.btnConfirmMerge.addEventListener('click', async () => {
            const srcId = el.mergeSourceSelect.value;
            const tgtId = el.mergeTargetSelect.value;

            if (srcId === tgtId) {
                alert('Source and target speaker must be different.');
                return;
            }

            try {
                const res = await fetch(`/api/transcripts/${state.currentTranscriptId}/merge-speakers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        source_speaker_id: srcId,
                        target_speaker_id: tgtId
                    })
                });

                if (!res.ok) throw new Error('Failed to merge speakers');
                el.mergeModal.classList.add('hidden');
                showToast('Speakers merged successfully');
                await loadTranscript(state.currentTranscriptId);
            } catch (err) {
                alert('Merge failed: ' + err.message);
            }
        });
    }

    function openMergeModal() {
        if (!state.transcript || !state.transcript.speakers || state.transcript.speakers.length < 2) {
            alert('At least 2 speakers are required to merge.');
            return;
        }

        const speakers = state.transcript.speakers;
        el.mergeSourceSelect.innerHTML = speakers.map(s => `<option value="${s.id}">${escapeHtml(s.label)}</option>`).join('');
        el.mergeTargetSelect.innerHTML = speakers.map(s => `<option value="${s.id}">${escapeHtml(s.label)}</option>`).join('');

        if (speakers.length > 1) {
            el.mergeTargetSelect.selectedIndex = 1;
        }

        el.mergeModal.classList.remove('hidden');
    }

    // --- Voice Profiles Drawer ---
    function initProfilesModal() {
        el.btnOpenProfiles.addEventListener('click', openProfilesModal);
        el.btnCloseProfilesModal.addEventListener('click', () => el.profilesModal.classList.add('hidden'));
        el.btnCloseProfiles.addEventListener('click', () => el.profilesModal.classList.add('hidden'));
    }

    async function openProfilesModal() {
        try {
            const res = await fetch('/api/profiles');
            const profiles = await res.json();

            el.profilesListContainer.innerHTML = '';
            if (!profiles || profiles.length === 0) {
                el.profilesListContainer.innerHTML = '<p class="text-secondary" style="padding: 12px 0;">No voice profiles enrolled yet. Rename any speaker in a transcript and check "Enroll voice embedding" to save their voice.</p>';
            } else {
                profiles.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'profile-item';
                    item.innerHTML = `
                        <div class="profile-info">
                            <span class="profile-name" style="color: ${p.color || '#f6c48f'}">● ${escapeHtml(p.name)}</span>
                            <span class="profile-meta">${p.sample_count || 1} audio sample(s) registered</span>
                        </div>
                        <button class="btn btn-sm btn-ghost btn-delete-profile" data-id="${p.id}" title="Remove profile">Delete</button>
                    `;
                    item.querySelector('.btn-delete-profile').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm(`Delete voice profile '${p.name}'?`)) {
                            await fetch(`/api/profiles/${p.id}`, { method: 'DELETE' });
                            showToast(`Profile "${p.name}" deleted`);
                            openProfilesModal();
                            refreshCounts();
                        }
                    });
                    el.profilesListContainer.appendChild(item);
                });
            }

            el.profilesModal.classList.remove('hidden');
        } catch (err) {
            alert('Failed to load profiles: ' + err.message);
        }
    }

    // --- History Drawer ---
    function initHistoryModal() {
        el.btnOpenHistory.addEventListener('click', openHistoryModal);
        el.btnCloseHistoryModal.addEventListener('click', () => el.historyModal.classList.add('hidden'));
        el.btnCloseHistory.addEventListener('click', () => el.historyModal.classList.add('hidden'));
    }

    async function openHistoryModal() {
        try {
            const res = await fetch('/api/history');
            const history = await res.json();

            el.historyListContainer.innerHTML = '';
            if (!history || history.length === 0) {
                el.historyListContainer.innerHTML = '<p class="text-secondary" style="padding: 12px 0;">No completed transcription sessions yet.</p>';
            } else {
                history.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'history-item';
                    div.style.cursor = 'pointer';

                    div.innerHTML = `
                        <div class="history-info">
                            <span class="history-name">${escapeHtml(item.filename)}</span>
                            <span class="history-meta">${formatTime(item.duration)} • ${item.speaker_count || 0} speaker(s) • ${item.model_size || 'base'}</span>
                        </div>
                        <div class="history-actions">
                            <button class="btn btn-sm btn-ghost btn-delete-history" data-job-id="${item.job_id}" title="Delete history entry">Delete</button>
                        </div>
                    `;

                    div.addEventListener('click', async () => {
                        el.historyModal.classList.add('hidden');
                        if (item.transcript_id) {
                            await loadTranscript(item.transcript_id);
                        }
                    });

                    div.querySelector('.btn-delete-history').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm(`Remove '${item.filename}' from history?`)) {
                            await fetch(`/api/history/${item.job_id}`, { method: 'DELETE' });
                            showToast('History item deleted');
                            openHistoryModal();
                            refreshCounts();
                        }
                    });

                    el.historyListContainer.appendChild(div);
                });
            }

            el.historyModal.classList.remove('hidden');
        } catch (err) {
            alert('Failed to load history: ' + err.message);
        }
    }

    // --- Export Handlers ---
    function initExports() {
        el.exportButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (!state.currentTranscriptId) return;
                const fmt = btn.getAttribute('data-fmt');
                window.location.href = `/api/transcripts/${state.currentTranscriptId}/export/${fmt}`;
                showToast(`Exporting .${fmt.toUpperCase()} file`);
            });
        });
    }

    // --- Badges Refresh ---
    async function refreshCounts() {
        try {
            const histRes = await fetch('/api/history');
            const history = await histRes.json();
            el.historyCountBadge.textContent = history.length || 0;

            const profRes = await fetch('/api/profiles');
            const profiles = await profRes.json();
            el.profilesCountBadge.textContent = profiles.length || 0;
        } catch (e) {}
    }

    // --- Startup Check for Existing Session ---
    async function checkLatestSession() {
        try {
            const res = await fetch('/api/jobs/latest');
            const data = await res.json();
            if (data && data.transcript_id) {
                await loadTranscript(data.transcript_id);
                return;
            }
        } catch (e) {}
        showSection('upload');
    }

    // --- Initialize Application ---
    function init() {
        initTheme();
        initUpload();
        initPlayerControls();
        initWaveform();
        initFilters();
        initRenameModal();
        initMergeModal();
        initProfilesModal();
        initHistoryModal();
        initExports();
        refreshCounts();
        checkLatestSession();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
