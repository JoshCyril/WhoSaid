// --- Who Said: Client Application Engine ---

const PALETTE = (window.WhoSaidUtils && window.WhoSaidUtils.PALETTE) || [
  "#fb7185", "#2dd4bf", "#fbbf24", "#c084fc", "#4ade80",
  "#f472b6", "#38bdf8", "#f97316", "#a3e635", "#818cf8"
];

const CAMEO_PRESETS = (window.WhoSaidUtils && window.WhoSaidUtils.CAMEO_PRESETS) || ["Felix", "Daisy", "Jack", "Willow", "Leo", "Maya", "Milo", "Zoe"];

const DEFAULT_AI_PROMPT = (window.WhoSaidUtils && window.WhoSaidUtils.DEFAULT_AI_PROMPT) || `Please provide a comprehensive summary of the following meeting/video transcript.
Highlight the main discussion points, key decisions made, and action items assigned to each speaker.`;

class WhoSaidApp {
  constructor() {
    this.currentJobId = null;
    this.currentTranscript = null;
    this.wavesurfer = null;
    this.wsRegions = null;
    this.websocket = null;
    this.activeTurnId = null;
    this.selectedFile = null;
    this.captionsVisible = true;
    this.speakerToRename = null;
    this.selectedRenameColor = PALETTE[0];
    this.currentAudioPeaks = [];

    // DOM Elements
    this.homeView = document.getElementById("homeView");
    this.workspaceView = document.getElementById("workspaceView");
    this.backendSettingsView = document.getElementById("backendSettingsView");
    this.profilesView = document.getElementById("profilesView");
    this.historyView = document.getElementById("historyView");
    this.navHome = document.getElementById("navHome");
    this.navWorkspace = document.getElementById("navWorkspace");
    this.navProfiles = document.getElementById("navProfiles");
    this.navHistory = document.getElementById("navHistory");
    this.navBackendSettings = document.getElementById("navBackendSettings");
    this.currentDbTable = "jobs";
    this.currentDbPage = 1;
    this.currentDbTableData = null;
    this.dbFilterQuery = "";
    this.openTabs = [];
    this.activeTabId = null;
    this.workspaceTabsContainer = document.getElementById("workspaceTabsContainer");
    this.workspaceTabsBar = document.getElementById("workspaceTabsBar");
    this.workspaceEmptyTabsState = document.getElementById("workspaceEmptyTabsState");
    this.workspacePlayerContainer = document.getElementById("workspacePlayerContainer");
    this.navWorkspaceDot = document.getElementById("navWorkspaceDot");
    this.navLogo = document.getElementById("navLogo");
    this.btnHomeUpload = document.getElementById("btnHomeUpload");
    this.btnHomeWorkspace = document.getElementById("btnHomeWorkspace");
    this.btnHomeRefreshHistory = document.getElementById("btnHomeRefreshHistory");
    this.homeRecentGrid = document.getElementById("homeRecentGrid");
    this.homeHeroSection = document.getElementById("homeHeroSection");
    this.btnHomeSectionUpload = document.getElementById("btnHomeSectionUpload");

    this.activeFileIndicator = document.getElementById("activeFileIndicator");
    this.activeFileName = document.getElementById("activeFileName");
    this.activeModelBadge = document.getElementById("activeModelBadge");

    this.mediaVideo = document.getElementById("mediaVideo");
    this.videoStage = document.getElementById("videoStage");
    this.mediaExpiredBanner = document.getElementById("mediaExpiredBanner");
    this.videoWrapper = document.querySelector(".video-wrapper");
    this.captionOverlay = document.getElementById("captionOverlay");
    this.captionSpeakerTag = document.getElementById("captionSpeakerTag");
    this.captionText = document.getElementById("captionText");
    this.captionAvatarWrap = document.getElementById("captionAvatarWrap");
    this.captionDialogueRow = document.getElementById("captionDialogueRow");
    this.playerCcOverlay = document.getElementById("playerCcOverlay");
    this.playerCcSpeakerTag = document.getElementById("playerCcSpeakerTag");
    this.playerCcText = document.getElementById("playerCcText");
    this.playerCcAvatarWrap = document.getElementById("playerCcAvatarWrap");
    this.currentActiveCaptionTurnId = null;

    // Video Player Controls Elements (Feature 4)
    this.btnVideoPlayPause = document.getElementById("btnVideoPlayPause");
    this.vPlayIcon = document.getElementById("vPlayIcon");
    this.vPauseIcon = document.getElementById("vPauseIcon");
    this.btnVideoSkipBack = document.getElementById("btnVideoSkipBack");
    this.btnVideoSkipFwd = document.getElementById("btnVideoSkipFwd");
    this.vTimeCurrent = document.getElementById("vTimeCurrent");
    this.vTimeDuration = document.getElementById("vTimeDuration");
    this.btnMuteToggle = document.getElementById("btnMuteToggle");
    this.volHighIcon = document.getElementById("volHighIcon");
    this.volMuteIcon = document.getElementById("volMuteIcon");
    this.vVolumeSlider = document.getElementById("vVolumeSlider");
    this.btnFullscreen = document.getElementById("btnFullscreen");
    this.btnCollapseControls = document.getElementById("btnCollapseControls");
    this.btnExpandControls = document.getElementById("btnExpandControls");
    this.isControlsCollapsed = false;

    // Caption Mode & Minimal Caption
    this.playerMinimalCaption = document.getElementById("playerMinimalCaption");
    this.minimalCaptionAvatar = document.getElementById("minimalCaptionAvatar");
    this.minimalCaptionSpeaker = document.getElementById("minimalCaptionSpeaker");
    this.captionCtrlGroup = document.getElementById("captionCtrlGroup");
    this.captionModeDropdown = document.getElementById("captionModeDropdown");
    this.captionMode = localStorage.getItem("whosaid_caption_mode") || "regular";
    this.lastCaptionMode = this.captionMode === "off" ? "regular" : this.captionMode;

    this.waveformContainer = document.getElementById("waveform");
    this.timeCurrent = document.getElementById("timeCurrent");
    this.timeDuration = document.getElementById("timeDuration");
    this.btnPlayPause = document.getElementById("btnPlayPause");
    this.playIcon = document.getElementById("playIcon");
    this.pauseIcon = document.getElementById("pauseIcon");
    this.btnSkipBack = document.getElementById("btnSkipBack");
    this.btnSkipForward = document.getElementById("btnSkipForward");
    this.playbackSpeedSelect = document.getElementById("playbackSpeedSelect");
    this.zoomSlider = document.getElementById("zoomSlider");
    this.btnToggleCaptions = document.getElementById("btnToggleCaptions");

    this.speakersList = document.getElementById("speakersList");
    this.speakerCountBadge = document.getElementById("speakerCountBadge");
    this.transcriptContainer = document.getElementById("transcriptContainer");
    this.transcriptSearchInput = document.getElementById("transcriptSearchInput");
    this.searchNoResults = document.getElementById("searchNoResults");

    // Clean Speaker Avatar Grid & Two-Column Folder Modal
    this.speakersAvatarGrid = document.getElementById("speakersAvatarGrid");
    this.btnOpenFolderModalDirect = document.getElementById("btnOpenFolderModalDirect");
    this.speakerFolderModal = document.getElementById("speakerFolderModal");
    this.btnCloseSpeakerFolderModal = document.getElementById("btnCloseSpeakerFolderModal");
    this.btnCloseFolderBottom = document.getElementById("btnCloseFolderBottom");
    this.folderSpeakersTableBody = document.getElementById("folderSpeakersTableBody");
    this.folderSearchInput = document.getElementById("folderSearchInput");
    this.folderSpeakerNameInput = document.getElementById("folderSpeakerNameInput");
    this.btnFolderSaveName = document.getElementById("btnFolderSaveName");
    this.folderMergeTargetSelect = document.getElementById("folderMergeTargetSelect");
    this.btnFolderExecuteMerge = document.getElementById("btnFolderExecuteMerge");
    this.folderTurnsList = document.getElementById("folderTurnsList");
    this.folderTurnsCount = document.getElementById("folderTurnsCount");
    this.folderAvatarPreview = document.getElementById("folderAvatarPreview");
    this.folderSpeakerIdBadge = document.getElementById("folderSpeakerIdBadge");
    this.folderColorRow = document.getElementById("folderColorRow");
    this.folderAvatarPresetsRow = document.getElementById("folderAvatarPresetsRow");
    this.waveformSegmentedTrack = document.getElementById("waveformSegmentedTrack");
    this.waveformSeekerLine = document.getElementById("waveformSeekerLine");
    this.waveformTimelineTooltip = document.getElementById("waveformTimelineTooltip");
    this.videoTimelineWaveformWrap = document.getElementById("videoTimelineWaveformWrap");
    this.activeFolderSpeakerId = null;

    // Modals
    this.uploadModal = document.getElementById("uploadModal");
    this.dropZone = document.getElementById("dropZone");
    this.fileInput = document.getElementById("fileInput");
    this.selectedFileInfo = document.getElementById("selectedFileInfo");
    this.selectedFileName = document.getElementById("selectedFileName");
    this.selectedFileSize = document.getElementById("selectedFileSize");
    this.btnRemoveFile = document.getElementById("btnRemoveFile");
    this.btnStartProcessing = document.getElementById("btnStartProcessing");

    // History Modal (Feature 3)
    this.btnHistory = document.getElementById("btnHistory");
    this.historyModal = document.getElementById("historyModal");
    this.headerHistoryCountBadge = document.getElementById("headerHistoryCountBadge");
    this.modalHistoryCountBadge = document.getElementById("modalHistoryCountBadge");
    this.historyCountBadge = document.getElementById("headerHistoryCountBadge") || document.getElementById("historyCountBadge");
    this.historyListContainer = document.getElementById("historyListContainer");
    this.historyLoading = document.getElementById("historyLoading");
    this.historyEmpty = document.getElementById("historyEmpty");

    // In-App Delete Confirmation Modal
    this.deleteConfirmModal = document.getElementById("deleteConfirmModal");
    this.btnCloseDeleteModal = document.getElementById("btnCloseDeleteModal");
    this.btnCancelDelete = document.getElementById("btnCancelDelete");
    this.btnExecuteDelete = document.getElementById("btnExecuteDelete");
    this.deleteConfirmFileName = document.getElementById("deleteConfirmFileName");
    this.pendingDeleteJobId = null;
    this.pendingDeleteFilename = null;
    this.pendingDeleteCallback = null;

    // Workspace Active Actions & Relink Video
    this.btnWorkspaceDeleteSession = document.getElementById("btnWorkspaceDeleteSession");
    this.btnRelinkVideo = document.getElementById("btnRelinkVideo");
    this.relinkVideoFileInput = document.getElementById("relinkVideoFileInput");

    this.progressModal = document.getElementById("progressModal");
    this.progressBarFill = document.getElementById("progressBarFill");
    this.progressPercent = document.getElementById("progressPercent");
    this.progressMessage = document.getElementById("progressMessage");

    this.renameModal = document.getElementById("renameModal");
    this.speakerNameInput = document.getElementById("speakerNameInput");
    this.renameAvatarPreview = document.getElementById("renameAvatarPreview");
    this.renameSpeakerIdTag = document.getElementById("renameSpeakerIdTag");
    this.renameSpeakerTurnsInfo = document.getElementById("renameSpeakerTurnsInfo");
    this.colorPickerGroup = document.getElementById("colorPickerGroup");
    this.avatarPickerGroup = document.getElementById("avatarPickerGroup");
    this.avatarSeedInput = document.getElementById("avatarSeedInput");
    this.selectedAvatarSeed = "Felix";
    this.enrollVoiceCheckbox = document.getElementById("enrollVoiceCheckbox");
    this.btnSaveSpeakerRename = document.getElementById("btnSaveSpeakerRename");

    this.profilesModal = document.getElementById("profilesModal");
    this.enrolledProfilesList = document.getElementById("enrolledProfilesList");
    this.enrolledProfilesTableBody = document.getElementById("enrolledProfilesTableBody");
    this.enrolledProfilesEmpty = document.getElementById("enrolledProfilesEmpty");
    this.profileSearchInput = document.getElementById("profileSearchInput");
    this.profileCountBadge = document.getElementById("profileCountBadge");
    this.modalProfileCount = document.getElementById("modalProfileCount");
    this.enrollNewProfileCard = document.getElementById("enrollNewProfileCard");

    // Merge Misclassified Speakers Modal
    this.mergeModal = document.getElementById("mergeModal");
    this.btnOpenMergeModal = document.getElementById("btnOpenMergeModal");
    this.btnCloseMergeModal = document.getElementById("btnCloseMergeModal");
    this.btnCancelMerge = document.getElementById("btnCancelMerge");
    this.btnConfirmMerge = document.getElementById("btnConfirmMerge");
    this.mergeSourceSelect = document.getElementById("mergeSourceSelect");
    this.mergeTargetSelect = document.getElementById("mergeTargetSelect");
    this.mergePreviewSource = document.getElementById("mergePreviewSource");
    this.mergePreviewTarget = document.getElementById("mergePreviewTarget");
    this.mergeTurnsCountText = document.getElementById("mergeTurnsCountText");

    this.exportMenu = document.getElementById("exportMenu");
    this.btnExportMenu = document.getElementById("btnExportMenu");

    // VS Code Workbench & Explorer Elements
    this.appWorkbenchLayout = document.getElementById("appWorkbenchLayout");
    this.vscodeActivityBar = document.getElementById("vscodeActivityBar");
    this.vscodeExplorerSidebar = document.getElementById("vscodeExplorerSidebar");
    this.vscodeResizer = document.getElementById("vscodeResizer");
    this.actBarExplorer = document.getElementById("actBarExplorer");
    this.actBarHome = document.getElementById("actBarHome") || this.navHome;
    this.actBarWorkspace = document.getElementById("actBarWorkspace") || this.navWorkspace;
    this.actBarWorkspaceDot = document.getElementById("actBarWorkspaceDot") || this.navWorkspaceDot;
    this.actBarProfiles = document.getElementById("actBarProfiles") || this.navProfiles;
    this.actBarHistory = document.getElementById("actBarHistory") || this.navHistory;
    this.actBarToggleSidebar = document.getElementById("actBarToggleSidebar");
    this.btnHeaderToggleSidebar = document.getElementById("btnHeaderToggleSidebar");

    this.btnHeaderOpenFolder = document.getElementById("btnHeaderOpenFolder");
    this.btnHomeOpenFolder = document.getElementById("btnHomeOpenFolder");
    this.btnExplorerOpenFolder = document.getElementById("btnExplorerOpenFolder");
    this.btnEmptyOpenFolder = document.getElementById("btnEmptyOpenFolder");
    this.btnEmptyOpenSample = document.getElementById("btnEmptyOpenSample");
    this.btnChangeFolder = document.getElementById("btnChangeFolder");
    this.btnExplorerRefresh = document.getElementById("btnExplorerRefresh");
    this.btnExplorerCollapseAll = document.getElementById("btnExplorerCollapseAll");
    this.btnExplorerFilterMedia = document.getElementById("btnExplorerFilterMedia");

    this.explorerSearchInput = document.getElementById("explorerSearchInput");
    this.btnClearExplorerFilter = document.getElementById("btnClearExplorerFilter");
    this.explorerRootFolderName = document.getElementById("explorerRootFolderName");
    this.explorerEmptyState = document.getElementById("explorerEmptyState");
    this.explorerTreeView = document.getElementById("explorerTreeView");
    this.recentFoldersWrap = document.getElementById("recentFoldersWrap");
    this.recentFoldersList = document.getElementById("recentFoldersList");

    this.headerOpenEditors = document.getElementById("headerOpenEditors");
    this.headerFolderTree = document.getElementById("headerFolderTree");
    this.openEditorsItem = document.getElementById("openEditorsItem");
    this.openEditorName = document.getElementById("openEditorName");
    this.noOpenEditors = document.getElementById("noOpenEditors");
    this.bodyOpenEditors = document.getElementById("bodyOpenEditors");

    // Explorer Properties Window
    this.headerProperties = document.getElementById("headerProperties");
    this.bodyProperties = document.getElementById("bodyProperties");
    this.propEmptyNotice = document.getElementById("propEmptyNotice");
    this.propDetailsCard = document.getElementById("propDetailsCard");
    this.propFileIcon = document.getElementById("propFileIcon");
    this.propFileName = document.getElementById("propFileName");
    this.propFileSize = document.getElementById("propFileSize");
    this.propFileDuration = document.getElementById("propFileDuration");
    this.propFileFormat = document.getElementById("propFileFormat");
    this.propFileStatus = document.getElementById("propFileStatus");
    this.propFilePath = document.getElementById("propFilePath");
    this.btnPropAction = document.getElementById("btnPropAction");
    this.btnPropActionText = document.getElementById("btnPropActionText");
    this.btnClearProperties = document.getElementById("btnClearProperties");
    this.selectedPropertyItem = null;
    this.explorerGroupBySelect = document.getElementById("explorerGroupBySelect");
    this.btnBarMerge = document.getElementById("btnBarMerge");

    // Explorer Properties Tags
    this.propTagsList = document.getElementById("propTagsList");
    this.propTagsCount = document.getElementById("propTagsCount");
    this.propNewTagInput = document.getElementById("propNewTagInput");
    this.btnPropAddTag = document.getElementById("btnPropAddTag");

    // Untranscribed Media Action Panel (Right Side)
    this.untranscribedOptionsPanel = document.getElementById("untranscribedOptionsPanel");
    this.untranscribedMediaTitle = document.getElementById("untranscribedMediaTitle");
    this.untranscribedDuration = document.getElementById("untranscribedDuration");
    this.untranscribedSize = document.getElementById("untranscribedSize");
    this.untranscribedFormat = document.getElementById("untranscribedFormat");
    this.btnStartWsTranscribe = document.getElementById("btnStartWsTranscribe");
    this.wsTranscribeProgressBox = document.getElementById("wsTranscribeProgressBox");
    this.wsTranscribeProgressBar = document.getElementById("wsTranscribeProgressBar");
    this.wsTranscribeProgressStatus = document.getElementById("wsTranscribeProgressStatus");
    this.wsTranscribeProgressPct = document.getElementById("wsTranscribeProgressPct");

    // Transcribe Path Modal
    this.transcribePathModal = document.getElementById("transcribePathModal");
    this.btnCloseTranscribePathModal = document.getElementById("btnCloseTranscribePathModal");
    this.btnCancelTranscribePath = document.getElementById("btnCancelTranscribePath");
    this.btnStartTranscribePath = document.getElementById("btnStartTranscribePath");
    this.transcribePathFileName = document.getElementById("transcribePathFileName");
    this.transcribePathFileSize = document.getElementById("transcribePathFileSize");
    this.transcribePathFullLocation = document.getElementById("transcribePathFullLocation");
    this.transcribePathExtBadge = document.getElementById("transcribePathExtBadge");

    this.currentFolderPath = null;
    this.currentFolderTree = null;
    this.mediaOnlyFilter = false;
    this.selectedTranscribeFilePath = null;

    // AI Summary Prompt Settings
    this.settingAiPromptInput = document.getElementById("settingAiPromptInput");
    this.btnSaveAiPrompt = document.getElementById("btnSaveAiPrompt");
    this.btnResetAiPrompt = document.getElementById("btnResetAiPrompt");
    this.aiPromptSavedNotice = document.getElementById("aiPromptSavedNotice");

    this.init();
  }

  init() {
    this.bindEvents();
    this.initVideoAutoHide();
    this.buildColorPicker();
    this.fetchProfileCount();
    this.loadHomeRecentSessions();
    this.initHomeMockupAvatars();
    this.checkResponsiveSidebar();
    this.initVsCodeExplorer();
    this.initDbExplorer();
    this.initSettingsAiPrompt();
  }

  // --- Homepage Mockup Cameo Avatars (Bob & Ruby with Pastel Colors) ---
  initHomeMockupAvatars() {
    const bobSlot = document.getElementById("mockupAvatarBob");
    if (bobSlot && window.CameoAvatar) {
      bobSlot.innerHTML = this.getDicebearAvatarHtml("Bob", "spk_bob", "#f6c48f", 28, "Bob");
    }
    const rubySlot = document.getElementById("mockupAvatarRuby");
    if (rubySlot && window.CameoAvatar) {
      rubySlot.innerHTML = this.getDicebearAvatarHtml("Ruby", "spk_ruby", "#cbb2fe", 28, "Ruby");
    }
  }

  // --- Collapsible Sidebar & Responsive 1080p Check ---
  toggleSidebar(forceState) {
    if (!this.workspaceView) return;
    const isMobile = window.innerWidth <= 1080;
    if (isMobile) {
      if (typeof forceState === "boolean") {
        this.workspaceView.classList.toggle("sidebar-open", forceState);
      } else {
        this.workspaceView.classList.toggle("sidebar-open");
      }
    } else {
      if (typeof forceState === "boolean") {
        this.workspaceView.classList.toggle("sidebar-collapsed", !forceState);
      } else {
        this.workspaceView.classList.toggle("sidebar-collapsed");
      }
      const isCollapsed = this.workspaceView.classList.contains("sidebar-collapsed");
      const toggleText = document.getElementById("btnToggleSidebarText");
      if (toggleText) {
        toggleText.textContent = isCollapsed ? "Show Panel" : "Panel";
      }
      const reopenBtn = document.getElementById("btnReopenSidebar");
      if (reopenBtn) {
        reopenBtn.classList.toggle("hidden", !isCollapsed);
      }
    }
  }

  checkResponsiveSidebar() {
    if (!this.workspaceView) return;
    if (window.innerWidth <= 1080) {
      this.workspaceView.classList.remove("sidebar-open");
    }
  }

  // --- Video Player Auto-Hide Overlay Controls ---
  initVideoAutoHide() {
    let hideTimer = null;
    const resetTimer = () => {
      if (this.videoWrapper) {
        this.videoWrapper.classList.remove("controls-hidden");
      }
      clearTimeout(hideTimer);
      if (this.mediaVideo && !this.mediaVideo.paused) {
        hideTimer = setTimeout(() => {
          if (this.videoWrapper && !this.mediaVideo.paused) {
            this.videoWrapper.classList.add("controls-hidden");
          }
        }, 2000);
      }
    };

    if (this.videoWrapper) {
      this.videoWrapper.addEventListener("mousemove", resetTimer);
      this.videoWrapper.addEventListener("mouseenter", resetTimer);
      this.videoWrapper.addEventListener("mouseleave", () => {
        if (this.mediaVideo && !this.mediaVideo.paused) {
          this.videoWrapper.classList.add("controls-hidden");
        }
      });
    }

    if (this.mediaVideo) {
      this.mediaVideo.addEventListener("play", () => {
        if (this.videoWrapper) {
          this.videoWrapper.classList.add("is-playing");
        }
        resetTimer();
      });
      this.mediaVideo.addEventListener("pause", () => {
        if (this.videoWrapper) {
          this.videoWrapper.classList.remove("is-playing");
          this.videoWrapper.classList.remove("controls-hidden");
        }
        clearTimeout(hideTimer);
      });
      this.mediaVideo.addEventListener("loadedmetadata", () => {
        const dur = this.mediaVideo.duration;
        if (dur && !isNaN(dur) && dur > 0) {
          if (this.currentTranscript) {
            this.currentTranscript.duration = dur;
            this.renderSegmentedWaveformTimeline(this.currentTranscript.segments, dur);
          }
          const formattedDur = this.formatTime(dur);
          if (this.timeDuration) this.timeDuration.textContent = formattedDur;
          if (this.vTimeDuration) this.vTimeDuration.textContent = formattedDur;
        }
      });
    }
  }

  // --- Local DiceBear Gaze Avatar Generator System (Offline from gaze.min.json) ---
  getDicebearAvatarUrl(seed, colorHex = "#38bdf8") {
    if (window.WhoSaidUtils && typeof window.WhoSaidUtils.getDicebearAvatarUrl === "function") {
      return window.WhoSaidUtils.getDicebearAvatarUrl(seed, colorHex);
    }
    if (window.GazeAvatar && window.GazeAvatar.renderDataUri) {
      return window.GazeAvatar.renderDataUri(seed, colorHex);
    }
    if (window.CameoAvatar && window.CameoAvatar.renderDataUri) {
      return window.CameoAvatar.renderDataUri(seed, colorHex);
    }
    const s = encodeURIComponent((seed || "speaker").trim());
    const c = (colorHex || "#38bdf8").replace("#", "").trim();
    return `https://api.dicebear.com/10.x/gaze/svg?seed=${s}&color=${c}&backgroundColor=transparent`;
  }

  getDicebearAvatarHtml(name, id, color = "#38bdf8", size = 26, avatarSeed = null, isSpeaking = false) {
    if (window.WhoSaidUtils && typeof window.WhoSaidUtils.getDicebearAvatarHtml === "function") {
      return window.WhoSaidUtils.getDicebearAvatarHtml(name, id, color, size, avatarSeed, isSpeaking);
    }
    if (window.GazeAvatar && window.GazeAvatar.renderHtml) {
      return window.GazeAvatar.renderHtml(name, id, color, size, avatarSeed, isSpeaking);
    }
    const seed = (avatarSeed || name || id || "speaker").trim();
    const url = this.getDicebearAvatarUrl(seed, color);
    const initial = (name || id || "S").charAt(0).toUpperCase();
    const spkClass = isSpeaking ? "is-speaking" : "";
    return `
      <span class="speaker-avatar-wrap ${spkClass}" data-speaker-id="${this.escapeHtml(id || '')}" style="width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;max-width:${size}px;max-height:${size}px;background:transparent;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;" title="${this.escapeHtml(name || id)}">
        <img class="speaker-avatar-img" width="${size}" height="${size}" src="${url}" alt="${this.escapeHtml(name || id)}" loading="lazy" style="width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;max-width:${size}px;max-height:${size}px;object-fit:contain;display:block;" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
        <span class="speaker-avatar-fallback" style="background:transparent; color:${color}; display:none;">${initial}</span>
      </span>
    `;
  }

  stopAllAvatarAnimations() {
    this._lastAnimatedSpeakerId = null;
    document.querySelectorAll(".speaker-avatar-wrap.is-speaking").forEach((el) => {
      el.classList.remove("is-speaking");
    });
  }

  // --- Views Navigation ---
  showHomeView() {
    if (this.homeView) this.homeView.classList.remove("hidden");
    if (this.workspaceView) this.workspaceView.classList.add("hidden");
    if (this.backendSettingsView) this.backendSettingsView.classList.add("hidden");
    if (this.profilesView) this.profilesView.classList.add("hidden");
    if (this.historyView) this.historyView.classList.add("hidden");
    if (this.navHome) this.navHome.classList.add("active");
    if (this.navWorkspace) this.navWorkspace.classList.remove("active");
    if (this.navProfiles) this.navProfiles.classList.remove("active");
    if (this.navHistory) this.navHistory.classList.remove("active");
    if (this.navBackendSettings) this.navBackendSettings.classList.remove("active");
    this.updateActivityBar("home");

    if (this.currentTranscript && this.btnHomeWorkspace) {
      this.btnHomeWorkspace.classList.remove("hidden");
    }
    this.loadHomeRecentSessions();
  }

  showWorkspaceView() {
    if (this.homeView) this.homeView.classList.add("hidden");
    if (this.workspaceView) this.workspaceView.classList.remove("hidden");
    if (this.backendSettingsView) this.backendSettingsView.classList.add("hidden");
    if (this.profilesView) this.profilesView.classList.add("hidden");
    if (this.historyView) this.historyView.classList.add("hidden");
    if (this.navHome) this.navHome.classList.remove("active");
    if (this.navWorkspace) this.navWorkspace.classList.add("active");
    if (this.navProfiles) this.navProfiles.classList.remove("active");
    if (this.navHistory) this.navHistory.classList.remove("active");
    if (this.navBackendSettings) this.navBackendSettings.classList.remove("active");
    this.updateActivityBar("workspace");
    this.renderWorkspaceTabs();
  }

  showProfilesView() {
    if (this.homeView) this.homeView.classList.add("hidden");
    if (this.workspaceView) this.workspaceView.classList.add("hidden");
    if (this.backendSettingsView) this.backendSettingsView.classList.add("hidden");
    if (this.historyView) this.historyView.classList.add("hidden");
    if (this.profilesView) this.profilesView.classList.remove("hidden");

    if (this.navHome) this.navHome.classList.remove("active");
    if (this.navWorkspace) this.navWorkspace.classList.remove("active");
    if (this.navProfiles) this.navProfiles.classList.add("active");
    if (this.navHistory) this.navHistory.classList.remove("active");
    if (this.navBackendSettings) this.navBackendSettings.classList.remove("active");
    this.updateActivityBar("profiles");
    this.loadVoiceProfilesList();
  }

  showHistoryView() {
    this.showHomeView();
    const recentEl = document.getElementById("homeRecentSection");
    if (recentEl) {
      recentEl.scrollIntoView({ behavior: "smooth" });
    }
  }

  showBackendSettingsView() {
    if (this.homeView) this.homeView.classList.add("hidden");
    if (this.workspaceView) this.workspaceView.classList.add("hidden");
    if (this.backendSettingsView) this.backendSettingsView.classList.remove("hidden");
    if (this.profilesView) this.profilesView.classList.add("hidden");
    if (this.historyView) this.historyView.classList.add("hidden");
    if (this.navHome) this.navHome.classList.remove("active");
    if (this.navWorkspace) this.navWorkspace.classList.remove("active");
    if (this.navProfiles) this.navProfiles.classList.remove("active");
    if (this.navHistory) this.navHistory.classList.remove("active");
    if (this.navBackendSettings) this.navBackendSettings.classList.add("active");
    this.updateActivityBar("backend");
    this.loadDbStats();
    this.loadDbTable(this.currentDbTable || "jobs", 1);
  }

  updateHistoryBadges(count) {
    if (this.headerHistoryCountBadge) this.headerHistoryCountBadge.textContent = count;
    if (this.modalHistoryCountBadge) this.modalHistoryCountBadge.textContent = `${count} job${count === 1 ? "" : "s"}`;
    if (this.historyCountBadge) this.historyCountBadge.textContent = count;
  }

  async loadHomeRecentSessions() {
    if (!this.homeRecentGrid) return;
    try {
      const resp = await fetch("/api/history");
      if (!resp.ok) return;
      const list = await resp.json();
      this.updateHistoryBadges(list.length);
      this.renderHomeRecentGrid(list);
    } catch (e) {
      console.error("Error loading home recent sessions:", e);
    }
  }

  updateRecentViewToggle() {
    const btnGallery = document.getElementById("btnToggleRecentGallery");
    const btnTable = document.getElementById("btnToggleRecentTable");
    const galleryGrid = document.getElementById("homeRecentGrid");
    const tableWrap = document.getElementById("homeRecentTableWrap");
    const isTable = this.recentViewMode === "table";

    if (btnGallery) {
      btnGallery.classList.toggle("active", !isTable);
      btnGallery.style.background = !isTable ? "rgba(56,189,248,0.18)" : "transparent";
      btnGallery.style.color = !isTable ? "#38bdf8" : "#94a3b8";
    }
    if (btnTable) {
      btnTable.classList.toggle("active", isTable);
      btnTable.style.background = isTable ? "rgba(56,189,248,0.18)" : "transparent";
      btnTable.style.color = isTable ? "#38bdf8" : "#94a3b8";
    }
    if (galleryGrid) galleryGrid.classList.toggle("hidden", isTable);
    if (tableWrap) tableWrap.classList.toggle("hidden", !isTable);
  }

  renderSpeakerAvatarsCluster(speakers, avatarSize = 32) {
    if (!speakers || speakers.length === 0) {
      return '<span style="font-size:11px;color:var(--text-dim,#94a3b8);font-style:italic;">No speakers identified</span>';
    }

    const maxVisible = 4;
    const visibleSpeakers = speakers.slice(0, maxVisible);
    const remainingCount = speakers.length - maxVisible;

    let html = '<div class="recent-speakers-cluster" style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;">';
    visibleSpeakers.forEach((s) => {
      const name = s.label || s.id || "Speaker";
      const color = s.color || "#38bdf8";
      const svg = this.getDicebearAvatarHtml(name, s.id, color, avatarSize);
      html += `
        <div class="recent-speaker-avatar-item" title="${this.escapeHtml(name)}" style="width:${avatarSize}px;height:${avatarSize}px;min-width:${avatarSize}px;min-height:${avatarSize}px;border-radius:6px;border:1.5px solid ${color}44;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;background:rgba(255,255,255,0.05);cursor:pointer;">
          ${svg}
        </div>
      `;
    });

    if (remainingCount > 0) {
      const remainingNames = speakers.slice(maxVisible).map((s) => s.label || s.id || "Speaker").join(", ");
      html += `
        <div class="recent-speaker-more-bubble" title="${this.escapeHtml(remainingNames)}" style="width:${avatarSize}px;height:${avatarSize}px;min-width:${avatarSize}px;min-height:${avatarSize}px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;cursor:pointer;background:rgba(56,189,248,0.14);color:#38bdf8;border:1.5px solid rgba(56,189,248,0.35);">
          +${remainingCount}
        </div>
      `;
    }
    html += '</div>';
    return html;
  }

  renderSessionTags(item) {
    const tags = [];
    // 1. Language tag
    if (item.language) {
      const langLabel = item.task === "translate" ? `${item.language.toUpperCase()} → EN` : item.language.toUpperCase();
      tags.push(`<span class="tag-pill tag-pill-emerald" title="Language: ${this.escapeHtml(langLabel)}">${this.escapeHtml(langLabel)}</span>`);
    } else {
      tags.push(`<span class="tag-pill tag-pill-emerald" title="Language: Auto">AUTO</span>`);
    }

    // 2. Whisper Model
    const model = item.model_size || "base";
    tags.push(`<span class="tag-pill tag-pill-cyan" title="Whisper Model: ${this.escapeHtml(model)}">${this.escapeHtml(model)}</span>`);

    // 3. File Format
    let ext = "VIDEO";
    if (item.filename) {
      const parts = item.filename.split(".");
      if (parts.length > 1) ext = parts.pop().toUpperCase();
    }
    tags.push(`<span class="tag-pill tag-pill-purple" title="Media Format: ${this.escapeHtml(ext)}">${this.escapeHtml(ext)}</span>`);

    // 4. Diarization
    tags.push(`<span class="tag-pill tag-pill-amber" title="Speaker Diarization Active">Diarized</span>`);

    return `<div class="tags-cell-wrap" style="display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;">${tags.join("")}</div>`;
  }

  renderHomeRecentGrid(list) {
    if (!this.homeRecentGrid) return;
    this.homeRecentGrid.innerHTML = "";

    const tableBody = document.getElementById("homeRecentTableBody");
    if (tableBody) tableBody.innerHTML = "";

    const hasRecent = Array.isArray(list) && list.length > 0;
    // User request: in UI only display the hero content if there is no 'recent transcript'
    if (this.homeHeroSection) {
      if (hasRecent) {
        this.homeHeroSection.classList.add("hidden");
      } else {
        this.homeHeroSection.classList.remove("hidden");
      }
    }
    if (this.btnHomeSectionUpload) {
      this.btnHomeSectionUpload.classList.toggle("hidden", !hasRecent);
    }

    const toggleWrap = document.getElementById("recentViewToggleWrap");
    if (toggleWrap) {
      toggleWrap.classList.toggle("hidden", !hasRecent);
    }

    if (!hasRecent) {
      this.homeRecentGrid.innerHTML = `
        <div class="recent-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <p>No recent transcriptions found. Click "Upload File" or open a folder to get started!</p>
        </div>
      `;
      const tableWrap = document.getElementById("homeRecentTableWrap");
      if (tableWrap) tableWrap.classList.add("hidden");
      if (this.homeRecentGrid) this.homeRecentGrid.classList.remove("hidden");
      return;
    }

    // Populate Both Gallery Cards Grid and Table Rows
    list.forEach((item) => {
      const createdDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recently";
      const durText = item.duration ? this.formatTime(item.duration) : "--:--";
      const speakersHtml = this.renderSpeakerAvatarsCluster(item.speakers || [], 32);
      const tagsHtml = this.renderSessionTags(item);

      // Media availability badge
      const mediaBadge = item.media_available
        ? '<span class="status-badge status-completed" title="Video file available for playback"><span class="status-dot"></span>Video ready</span>'
        : '<span class="status-badge" style="background:rgba(56,189,248,0.12);color:#38bdf8" title="Audio track ready"><span class="status-dot" style="background:#38bdf8"></span>Audio ready</span>';

      // 1. Gallery Card
      const card = document.createElement("div");
      card.className = "recent-session-card";
      card.style.transition = "opacity 0.25s ease, transform 0.25s ease";

      card.innerHTML = `
        <div class="recent-card-top">
          <div class="recent-file-name" title="${this.escapeHtml(item.filename)}">
            ${this.escapeHtml(item.filename)}
          </div>
          <div class="recent-badge-group">
            <span class="model-badge">${item.model_size || 'base'}</span>
          </div>
        </div>

        <div class="recent-meta-row">
          <span style="display:inline-flex;align-items:center;gap:4px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-xs"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${durText}
          </span>
          <span style="display:inline-flex;align-items:center;gap:4px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-xs"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${createdDate}
          </span>
          ${mediaBadge}
        </div>

        <div class="recent-speakers-row" style="margin: 10px 0;">
          ${speakersHtml}
        </div>

        <div style="margin-bottom: 12px;">
          ${tagsHtml}
        </div>

        <div class="recent-card-footer">
          <button class="btn btn-primary btn-sm btn-open-recent" style="display:inline-flex;align-items:center;gap:6px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Open in Workspace
          </button>
          <button class="btn-ctrl-icon btn-delete-recent" title="Delete session from history" style="opacity:0.8;color:#ef4444;cursor:pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon-sm" style="stroke:#ef4444">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      card.querySelector(".btn-open-recent").addEventListener("click", () => {
        if (item.transcript_id) {
          this.loadTranscript(item.transcript_id);
        }
      });

      card.querySelector(".btn-delete-recent").addEventListener("click", (e) => {
        e.stopPropagation();
        this.openDeleteConfirmModal(item.job_id, item.filename, () => {
          card.style.opacity = "0";
          card.style.transform = "scale(0.95)";
          setTimeout(() => {
            card.remove();
            if (this.homeRecentGrid && this.homeRecentGrid.children.length === 0) {
              this.renderHomeRecentGrid([]);
            }
          }, 250);
        });
      });

      this.homeRecentGrid.appendChild(card);

      // 2. Table Row
      if (tableBody) {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-surface-elevated/40 transition-colors";
        tr.innerHTML = `
          <td class="py-3.5 px-4 font-medium text-text-primary">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
              <div class="min-w-0 max-w-xs truncate" title="${this.escapeHtml(item.filename)}">
                <span class="font-medium text-text-primary text-xs sm:text-sm block truncate">${this.escapeHtml(item.filename)}</span>
                <span class="text-[11px] text-text-muted">${durText}</span>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-4">
            ${speakersHtml}
          </td>
          <td class="py-3.5 px-4">
            ${tagsHtml}
          </td>
          <td class="py-3.5 px-4 text-xs text-text-muted whitespace-nowrap">
            <div>${createdDate}</div>
            <div class="text-[11px] text-text-dim">${durText}</div>
          </td>
          <td class="py-3.5 px-4 text-right whitespace-nowrap">
            <div class="inline-flex items-center gap-1.5 justify-end">
              <button class="btn-table-open btn btn-xs btn-primary inline-flex items-center gap-1" title="Open in Workspace">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Open</span>
              </button>
              <button class="btn-table-delete p-1 rounded hover:bg-red-500/10 text-red-400" title="Delete session">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        `;

        tr.querySelector(".btn-table-open").addEventListener("click", () => {
          if (item.transcript_id) {
            this.loadTranscript(item.transcript_id);
          }
        });

        tr.querySelector(".btn-table-delete").addEventListener("click", (e) => {
          e.stopPropagation();
          this.openDeleteConfirmModal(item.job_id, item.filename, () => {
            tr.remove();
            if (tableBody.children.length === 0) {
              this.renderHomeRecentGrid([]);
            }
          });
        });

        tableBody.appendChild(tr);
      }
    });

    this.updateRecentViewToggle();
  }

  bindEvents() {
    // Navigation tabs
    if (this.navHome) this.navHome.addEventListener("click", () => this.showHomeView());
    if (this.navLogo) this.navLogo.addEventListener("click", () => this.showHomeView());
    if (this.navWorkspace) {
      this.navWorkspace.addEventListener("click", () => {
        if (this.currentTranscript) {
          this.showWorkspaceView();
        } else {
          this.showToast("No transcript loaded yet. Pick a session or upload media.", "info");
        }
      });
    }
    if (this.navProfiles) {
      this.navProfiles.addEventListener("click", () => this.showProfilesView());
    }
    if (this.navHistory) {
      this.navHistory.addEventListener("click", () => this.showHistoryView());
    }
    if (this.navBackendSettings) {
      this.navBackendSettings.addEventListener("click", () => this.showBackendSettingsView());
    }



    // Homepage CTA buttons
    if (this.btnHomeUpload) this.btnHomeUpload.addEventListener("click", () => this.openUploadModal());
    if (this.btnHomeSectionUpload) this.btnHomeSectionUpload.addEventListener("click", () => this.openUploadModal());
    if (this.btnHomeWorkspace) this.btnHomeWorkspace.addEventListener("click", () => this.showWorkspaceView());
    if (this.btnHomeRefreshHistory) this.btnHomeRefreshHistory.addEventListener("click", () => this.loadHomeRecentSessions());

    // Advanced Database Section Accordion Toggle
    const btnToggleAdvancedDb = document.getElementById("btnToggleAdvancedDb");
    const advancedDbContent = document.getElementById("advancedDbContent");
    const advancedDbChevron = document.getElementById("advancedDbChevron");
    const advancedDbStatusBadge = document.getElementById("advancedDbStatusBadge");

    if (btnToggleAdvancedDb && advancedDbContent) {
      btnToggleAdvancedDb.addEventListener("click", () => {
        const isHidden = advancedDbContent.classList.toggle("hidden");
        if (advancedDbChevron) {
          advancedDbChevron.style.transform = isHidden ? "rotate(0deg)" : "rotate(90deg)";
        }
        if (advancedDbStatusBadge) {
          advancedDbStatusBadge.textContent = isHidden ? "Collapsed" : "Expanded";
        }
      });
    }

    // Header actions
    const btnNewUpload = document.getElementById("btnNewUpload");
    if (btnNewUpload) btnNewUpload.addEventListener("click", () => this.openUploadModal());
    const btnManageProfiles = document.getElementById("btnManageProfiles");
    if (btnManageProfiles) btnManageProfiles.addEventListener("click", () => this.openProfilesModal());
    if (this.btnHistory) {
      this.btnHistory.addEventListener("click", () => this.openHistoryModal());
    }

    // Theme Switcher (Light / Dark / System)
    this.initTheme();
    const btnThemeToggle = document.getElementById("btnThemeToggle");
    const themeDropdownMenu = document.getElementById("themeDropdownMenu");
    if (btnThemeToggle && themeDropdownMenu) {
      btnThemeToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        themeDropdownMenu.classList.toggle("hidden");
        const navMoreMenu = document.getElementById("navMoreMenu");
        if (navMoreMenu) navMoreMenu.classList.add("hidden");
      });
      document.addEventListener("click", (e) => {
        if (!btnThemeToggle.contains(e.target) && !themeDropdownMenu.contains(e.target)) {
          themeDropdownMenu.classList.add("hidden");
        }
      });
      themeDropdownMenu.querySelectorAll(".theme-option-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const selectedTheme = btn.getAttribute("data-theme");
          this.setTheme(selectedTheme);
          themeDropdownMenu.classList.add("hidden");
        });
      });
    }

    // Recent view toggle: Gallery vs Table
    this.recentViewMode = localStorage.getItem("whosaid_recent_view_mode") || "gallery";
    const btnToggleRecentGallery = document.getElementById("btnToggleRecentGallery");
    const btnToggleRecentTable = document.getElementById("btnToggleRecentTable");
    if (btnToggleRecentGallery && btnToggleRecentTable) {
      btnToggleRecentGallery.addEventListener("click", () => {
        this.recentViewMode = "gallery";
        localStorage.setItem("whosaid_recent_view_mode", "gallery");
        this.updateRecentViewToggle();
      });
      btnToggleRecentTable.addEventListener("click", () => {
        this.recentViewMode = "table";
        localStorage.setItem("whosaid_recent_view_mode", "table");
        this.updateRecentViewToggle();
      });
    }

    // Custom Electron Titlebar Window Controls
    this.initWindowControls();

    // Sidebar Collapsible Toggles
    const btnToggleSidebar = document.getElementById("btnToggleSidebar");
    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener("click", () => this.toggleSidebar());
    }
    const btnCloseSidebar = document.getElementById("btnCloseSidebar");
    if (btnCloseSidebar) {
      btnCloseSidebar.addEventListener("click", () => this.toggleSidebar(false));
    }
    window.addEventListener("resize", () => this.checkResponsiveSidebar());

    // History Modal events (Feature 3)
    const btnCloseHist = document.getElementById("btnCloseHistoryModal");
    if (btnCloseHist) btnCloseHist.addEventListener("click", () => this.closeHistoryModal());
    const btnCloseHistBtm = document.getElementById("btnCloseHistoryBottom");
    if (btnCloseHistBtm) btnCloseHistBtm.addEventListener("click", () => this.closeHistoryModal());

    // In-App Delete Confirmation Modal events
    if (this.btnCloseDeleteModal) this.btnCloseDeleteModal.addEventListener("click", () => this.closeDeleteConfirmModal());
    if (this.btnCancelDelete) this.btnCancelDelete.addEventListener("click", () => this.closeDeleteConfirmModal());
    if (this.btnExecuteDelete) this.btnExecuteDelete.addEventListener("click", () => this.executeDeleteSession());

    // Workspace action controls (Requirement 3: Right Panel controls)
    const btnBarMerge = document.getElementById("btnBarMerge");
    const btnBarExport = document.getElementById("btnBarExport");
    const btnBarDelete = document.getElementById("btnBarDelete");
    const btnReopenSidebar = document.getElementById("btnReopenSidebar");
    const btnEmptyTabsHome = document.getElementById("btnEmptyTabsHome");
    const exportMenu = document.getElementById("exportMenu");

    if (btnBarMerge) {
      btnBarMerge.addEventListener("click", () => this.openMergeModal());
    }

    if (this.explorerGroupBySelect) {
      this.explorerGroupBySelect.addEventListener("change", () => {
        this.refreshExplorerTree();
      });
    }

    if (btnBarExport && exportMenu) {
      btnBarExport.addEventListener("click", (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle("hidden");
      });
      document.addEventListener("click", () => exportMenu.classList.add("hidden"));
      exportMenu.querySelectorAll(".dropdown-item").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const fmt = btn.getAttribute("data-format");
          if (fmt) this.triggerExport(fmt);
          exportMenu.classList.add("hidden");
        });
      });
    }

    if (btnBarDelete) {
      btnBarDelete.addEventListener("click", () => {
        if (this.currentTranscript) {
          const fn = this.currentTranscript.filename || "Current Session";
          this.openDeleteConfirmModal(this.currentTranscript.job_id, fn, () => {
            this.closeWorkspaceTab(this.currentTranscript.id);
          });
        }
      });
    }

    if (btnReopenSidebar) {
      btnReopenSidebar.addEventListener("click", () => this.toggleSidebar(true));
    }

    if (btnEmptyTabsHome) {
      btnEmptyTabsHome.addEventListener("click", () => this.showHomeView());
    }

    // Two-Column Speaker Directory & Folder Viewer events
    if (this.btnOpenFolderModalDirect) {
      this.btnOpenFolderModalDirect.addEventListener("click", () => this.openSpeakerFolderModal());
    }
    if (this.btnCloseSpeakerFolderModal) {
      this.btnCloseSpeakerFolderModal.addEventListener("click", () => this.closeSpeakerFolderModal());
    }
    if (this.btnCloseFolderBottom) {
      this.btnCloseFolderBottom.addEventListener("click", () => this.closeSpeakerFolderModal());
    }
    if (this.folderSearchInput) {
      this.folderSearchInput.addEventListener("input", (e) => this.filterFolderSpeakers(e.target.value));
    }
    if (this.btnFolderSaveName) {
      this.btnFolderSaveName.addEventListener("click", () => this.saveFolderSpeakerName());
    }
    if (this.btnFolderExecuteMerge) {
      this.btnFolderExecuteMerge.addEventListener("click", () => this.executeFolderMerge());
    }

    // Video Segmented Waveform Timeline Seeker events
    if (this.videoTimelineWaveformWrap) {
      this.videoTimelineWaveformWrap.addEventListener("mousemove", (e) => this.handleWaveformHover(e));
      this.videoTimelineWaveformWrap.addEventListener("mouseleave", () => {
        if (this.waveformTimelineTooltip) this.waveformTimelineTooltip.classList.add("hidden");
      });
      this.videoTimelineWaveformWrap.addEventListener("click", (e) => this.handleWaveformClick(e));
    }

    // Relink Local Video events
    if (this.btnRelinkVideo && this.relinkVideoFileInput) {
      this.btnRelinkVideo.addEventListener("click", () => this.relinkVideoFileInput.click());
      this.relinkVideoFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file && this.mediaVideo) {
          const fileUrl = URL.createObjectURL(file);
          this.mediaVideo.src = fileUrl;
          this.mediaVideo.classList.remove("hidden");
          if (this.mediaExpiredBanner) this.mediaExpiredBanner.classList.add("hidden");
          this.mediaVideo.load();
          this.showToast(`Relinked video: ${file.name}`, "success");
        }
      });
    }

    // Upload Modal events
    document.getElementById("btnCloseUploadModal").addEventListener("click", () => this.closeUploadModal());
    document.getElementById("btnCancelUpload").addEventListener("click", () => this.closeUploadModal());
    this.dropZone.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", (e) => this.handleFileSelection(e.target.files[0]));

    this.dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.dropZone.classList.add("dragover");
    });
    this.dropZone.addEventListener("dragleave", () => this.dropZone.classList.remove("dragover"));
    this.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.dropZone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        this.handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    this.btnRemoveFile.addEventListener("click", () => this.clearSelectedFile());
    this.btnStartProcessing.addEventListener("click", () => this.startProcessingUpload());

    // Rename Modal events
    document.getElementById("btnCloseRenameModal").addEventListener("click", () => this.closeRenameModal());
    document.getElementById("btnCancelRename").addEventListener("click", () => this.closeRenameModal());
    this.btnSaveSpeakerRename.addEventListener("click", () => this.saveSpeakerRename());

    // Profiles View & Modal events
    const btnCloseProf = document.getElementById("btnCloseProfilesModal");
    if (btnCloseProf) btnCloseProf.addEventListener("click", () => this.closeProfilesModal());
    const btnCloseProfBtm = document.getElementById("btnCloseProfilesBottom");
    if (btnCloseProfBtm) btnCloseProfBtm.addEventListener("click", () => this.closeProfilesModal());
    const btnAddProf = document.getElementById("btnAddNewProfile");
    if (btnAddProf) {
      btnAddProf.addEventListener("click", () => {
        if (this.enrollNewProfileCard) this.enrollNewProfileCard.classList.toggle("hidden");
      });
    }
    const btnCancelEnr = document.getElementById("btnCancelEnroll");
    if (btnCancelEnr) {
      btnCancelEnr.addEventListener("click", () => {
        if (this.enrollNewProfileCard) this.enrollNewProfileCard.classList.add("hidden");
      });
    }
    const btnSubEnr = document.getElementById("btnSubmitEnroll");
    if (btnSubEnr) btnSubEnr.addEventListener("click", () => this.submitNewVoiceProfile());

    const btnProfRefresh = document.getElementById("btnProfilesRefresh");
    if (btnProfRefresh) btnProfRefresh.addEventListener("click", () => this.loadVoiceProfilesList());

    if (this.profileSearchInput) {
      this.profileSearchInput.addEventListener("input", (e) => {
        this.filterAndRenderVoiceProfiles(e.target.value.trim().toLowerCase());
      });
    }

    // Merge Misclassified Speakers Modal events
    if (this.btnOpenMergeModal) {
      this.btnOpenMergeModal.addEventListener("click", () => this.openMergeModal());
    }
    if (this.btnCloseMergeModal) {
      this.btnCloseMergeModal.addEventListener("click", () => this.closeMergeModal());
    }
    if (this.btnCancelMerge) {
      this.btnCancelMerge.addEventListener("click", () => this.closeMergeModal());
    }
    if (this.btnConfirmMerge) {
      this.btnConfirmMerge.addEventListener("click", () => this.executeMergeSpeakers());
    }
    if (this.mergeSourceSelect) {
      this.mergeSourceSelect.addEventListener("change", () => this.updateMergePreview());
    }
    if (this.mergeTargetSelect) {
      this.mergeTargetSelect.addEventListener("change", () => this.updateMergePreview());
    }

    // Legacy Export Dropdown (Guarded)
    if (this.btnExportMenu && this.exportMenu) {
      this.btnExportMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        this.exportMenu.classList.toggle("hidden");
      });
      document.addEventListener("click", () => this.exportMenu.classList.add("hidden"));
      this.exportMenu.querySelectorAll(".dropdown-item").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const fmt = btn.getAttribute("data-format");
          this.triggerExport(fmt);
          this.exportMenu.classList.add("hidden");
        });
      });
    }

    // Player & Waveform controls
    this.btnPlayPause.addEventListener("click", () => this.togglePlayback());
    this.btnSkipBack.addEventListener("click", () => this.seekDelta(-5));
    this.btnSkipForward.addEventListener("click", () => this.seekDelta(5));

    // Video Player Dedicated Controls (Feature 4)
    if (this.btnVideoPlayPause) {
      this.btnVideoPlayPause.addEventListener("click", () => this.togglePlayback());
    }
    if (this.btnVideoSkipBack) {
      this.btnVideoSkipBack.addEventListener("click", () => this.seekDelta(-10));
    }
    if (this.btnVideoSkipFwd) {
      this.btnVideoSkipFwd.addEventListener("click", () => this.seekDelta(10));
    }
    if (this.vVolumeSlider) {
      this.vVolumeSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        this.mediaVideo.volume = val;
        this.mediaVideo.muted = (val === 0);
        this.updateVolumeIcon();
      });
    }
    if (this.btnMuteToggle) {
      this.btnMuteToggle.addEventListener("click", () => this.toggleMute());
    }
    if (this.btnFullscreen) {
      this.btnFullscreen.addEventListener("click", () => this.toggleFullscreen());
    }
    if (this.btnCollapseControls) {
      this.btnCollapseControls.addEventListener("click", () => {
        if (this.videoCtrlBottomBar) this.videoCtrlBottomBar.classList.add("is-collapsed");
        if (this.btnExpandControls) this.btnExpandControls.classList.remove("hidden");
        this.isControlsCollapsed = true;
      });
    }
    if (this.btnExpandControls) {
      this.btnExpandControls.addEventListener("click", () => {
        if (this.videoCtrlBottomBar) this.videoCtrlBottomBar.classList.remove("is-collapsed");
        if (this.btnExpandControls) this.btnExpandControls.classList.add("hidden");
        this.isControlsCollapsed = false;
      });
    }

    this.playbackSpeedSelect.addEventListener("change", (e) => {
      const rate = parseFloat(e.target.value);
      this.mediaVideo.playbackRate = rate;
    });

    this.zoomSlider.addEventListener("input", (e) => {
      if (this.wavesurfer) {
        const px = Number(e.target.value);
        this.wavesurfer.zoom(px);
        const scrollEl = this.waveformContainer.querySelector("[part='scroll']");
        if (scrollEl && this.mediaVideo.duration) {
          const ratio = this.mediaVideo.currentTime / this.mediaVideo.duration;
          scrollEl.scrollLeft = ratio * scrollEl.scrollWidth - scrollEl.clientWidth / 2;
        }
      }
    });

    if (this.btnToggleCaptions) {
      this.btnToggleCaptions.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.captionModeDropdown) {
          this.captionModeDropdown.classList.toggle("hidden");
        }
      });
    }

    if (this.captionModeDropdown) {
      this.captionModeDropdown.querySelectorAll(".caption-mode-item").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const mode = btn.dataset.mode;
          this.setCaptionMode(mode);
          this.captionModeDropdown.classList.add("hidden");
        });
      });
    }

    document.addEventListener("click", (e) => {
      if (this.captionModeDropdown && !e.target.closest("#captionCtrlGroup")) {
        this.captionModeDropdown.classList.add("hidden");
      }
      if (!e.target.closest(".turn-reassign-menu") && !e.target.closest(".btn-reassign-turn") && !e.target.closest(".btn-folder-move-turn")) {
        document.querySelectorAll(".turn-reassign-menu").forEach((m) => m.remove());
      }
    });

    // Global Keyboard Shortcuts Suite
    window.addEventListener("keydown", (e) => {
      // Do not trigger if typing in an input, textarea, select, or editable element
      const tag = (e.target.tagName || "").toUpperCase();
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        e.target.isContentEditable ||
        (e.target.closest && e.target.closest("[contenteditable='true']"))
      ) {
        return;
      }

      // Do not intercept if browser modifier keys (Ctrl/Cmd/Alt) are held down
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;

      // Play / Pause: Space or 'k'
      if (code === "Space" || key === "k") {
        e.preventDefault();
        this.togglePlayback();
        return;
      }

      // Skip back 5s / 10s: Left Arrow (-5s), 'j' (-10s)
      if (code === "ArrowLeft") {
        e.preventDefault();
        this.seekDelta(-5);
        return;
      }
      if (key === "j") {
        e.preventDefault();
        this.seekDelta(-10);
        return;
      }

      // Skip forward 5s / 10s: Right Arrow (+5s), 'l' (+10s)
      if (code === "ArrowRight") {
        e.preventDefault();
        this.seekDelta(5);
        return;
      }
      if (key === "l") {
        e.preventDefault();
        this.seekDelta(10);
        return;
      }

      // Volume Up (+10%): Up Arrow
      if (code === "ArrowUp") {
        e.preventDefault();
        this.adjustVolume(0.1);
        return;
      }

      // Volume Down (-10%): Down Arrow
      if (code === "ArrowDown") {
        e.preventDefault();
        this.adjustVolume(-0.1);
        return;
      }

      // Mute / Unmute: 'm'
      if (key === "m") {
        e.preventDefault();
        this.toggleMute();
        return;
      }

      // Fullscreen: 'f'
      if (key === "f") {
        e.preventDefault();
        this.toggleFullscreen();
        return;
      }

      // Subtitles / Captions: 'c'
      if (key === "c") {
        e.preventDefault();
        this.toggleCaptions();
        return;
      }

      // Frame / 1s step backward: ',' or '<'
      if (key === "," || key === "<") {
        e.preventDefault();
        this.seekDelta(-1);
        return;
      }

      // Frame / 1s step forward: '.' or '>'
      if (key === "." || key === ">") {
        e.preventDefault();
        this.seekDelta(1);
        return;
      }

      // Number keys 0-9: Seek to 0% - 90%
      if (/^[0-9]$/.test(e.key)) {
        if (this.mediaVideo && this.mediaVideo.duration) {
          e.preventDefault();
          const pct = parseInt(e.key, 10) * 0.1;
          this.mediaVideo.currentTime = this.mediaVideo.duration * pct;
          this.onTimeUpdate();
        }
        return;
      }

      // Home: Seek to start (0s)
      if (code === "Home") {
        if (this.mediaVideo) {
          e.preventDefault();
          this.mediaVideo.currentTime = 0;
          this.onTimeUpdate();
        }
        return;
      }

      // End: Seek to end
      if (code === "End") {
        if (this.mediaVideo && this.mediaVideo.duration) {
          e.preventDefault();
          this.mediaVideo.currentTime = this.mediaVideo.duration;
          this.onTimeUpdate();
        }
        return;
      }
    });

    // Video playback sync
    this.mediaVideo.addEventListener("play", () => {
      this.updatePlayIcon(true);
      if (this.wavesurfer && !this.wavesurfer.isPlaying()) {
        try { this.wavesurfer.play(); } catch(e) {}
      }
      this.startPlaybackSyncLoop();
    });
    this.mediaVideo.addEventListener("pause", () => {
      this.updatePlayIcon(false);
      if (this.wavesurfer && this.wavesurfer.isPlaying()) {
        try { this.wavesurfer.pause(); } catch(e) {}
      }
      this.stopPlaybackSyncLoop();
      this.stopAllAvatarAnimations();
      this.onTimeUpdate();
    });
    this.mediaVideo.addEventListener("ended", () => {
      this.updatePlayIcon(false);
      if (this.wavesurfer) {
        try { this.wavesurfer.pause(); this.wavesurfer.setTime(0); } catch(e) {}
      }
      this.stopPlaybackSyncLoop();
      this.stopAllAvatarAnimations();
      this.onTimeUpdate();
    });
    this.mediaVideo.addEventListener("seeked", () => {
      if (this.wavesurfer) {
        try { this.wavesurfer.setTime(this.mediaVideo.currentTime); } catch(e) {}
      }
      this.onTimeUpdate();
    });
    this.mediaVideo.addEventListener("seeking", () => {
      if (this.wavesurfer) {
        try { this.wavesurfer.setTime(this.mediaVideo.currentTime); } catch(e) {}
      }
      this.onTimeUpdate();
    });

    // Search input
    this.transcriptSearchInput.addEventListener("input", (e) => this.filterTranscript(e.target.value));

    // Waveform timeline hover & click seeking events
    if (this.videoTimelineWaveformWrap) {
      this.videoTimelineWaveformWrap.addEventListener("mousemove", (e) => this.handleWaveformHover(e));
      this.videoTimelineWaveformWrap.addEventListener("mouseenter", (e) => this.handleWaveformHover(e));
      this.videoTimelineWaveformWrap.addEventListener("mouseleave", () => this.handleWaveformLeave());
      this.videoTimelineWaveformWrap.addEventListener("click", (e) => this.handleWaveformClick(e));
    }

    // Video Stage screen single-click play/pause & double-click fullscreen
    if (this.videoStage) {
      let clickTimer = null;
      this.videoStage.addEventListener("click", (e) => {
        // Ignore clicks if clicked on controls bottom bar, top bar, expired banner, or any button/input/link
        if (
          e.target.closest("#videoCtrlBottomBar") ||
          e.target.closest("#videoPlayerTopBar") ||
          e.target.closest(".media-expired-banner") ||
          e.target.closest("button") ||
          e.target.closest("input") ||
          e.target.closest("a")
        ) {
          return;
        }

        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        clickTimer = setTimeout(() => {
          this.togglePlayback();
          clickTimer = null;
        }, 220);
      });

      this.videoStage.addEventListener("dblclick", (e) => {
        if (
          e.target.closest("#videoCtrlBottomBar") ||
          e.target.closest("#videoPlayerTopBar") ||
          e.target.closest(".media-expired-banner") ||
          e.target.closest("button") ||
          e.target.closest("input")
        ) {
          return;
        }
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        this.toggleFullscreen();
      });
    }

    // Fullscreen state listener (Standard & WebKit)
    const onFsChange = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (this.videoWrapper) {
        this.videoWrapper.classList.toggle("is-fullscreen", isFs);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
  }

  // --- Smooth Playback Synchronization Loop ---
  startPlaybackSyncLoop() {
    this.stopPlaybackSyncLoop();
    const loop = () => {
      if (!this.mediaVideo.paused && !this.mediaVideo.ended) {
        this.onTimeUpdate();
        this.syncRafId = requestAnimationFrame(loop);
      }
    };
    this.syncRafId = requestAnimationFrame(loop);
  }

  stopPlaybackSyncLoop() {
    if (this.syncRafId) {
      cancelAnimationFrame(this.syncRafId);
      this.syncRafId = null;
    }
  }

  // --- Waveform & Player Init ---
  initWaveSurfer(audioUrl, peaks) {
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
      this.wavesurfer = null;
    }

    const wsPlugins = [];
    if (window.WaveSurfer.Regions) {
      this.wsRegions = window.WaveSurfer.Regions.create();
      wsPlugins.push(this.wsRegions);
    }

    // WaveSurfer renders the audio waveform independently without overriding mediaVideo's video stream
    this.wavesurfer = WaveSurfer.create({
      container: this.waveformContainer,
      waveColor: "rgba(56, 189, 248, 0.35)",
      progressColor: "#38bdf8",
      cursorColor: "#ffffff",
      cursorWidth: 2,
      height: 48,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      minPxPerSec: Number(this.zoomSlider.value),
      autoScroll: true,
      autoCenter: true,
      plugins: wsPlugins
    });

    // Keep WaveSurfer silent so the video element handles sound without echo
    try { this.wavesurfer.setVolume(0); } catch(e) {}

    // Load audio peaks
    if (peaks && peaks.length > 0) {
      this.wavesurfer.load(audioUrl, [peaks]);
    } else {
      this.wavesurfer.load(audioUrl);
    }

    // Waveform seek updates video player
    this.wavesurfer.on("interaction", (newTime) => {
      if (this.mediaVideo) {
        this.mediaVideo.currentTime = newTime;
        this.onTimeUpdate();
      }
    });

    // Render speaker regions once ready
    this.wavesurfer.on("ready", () => {
      this.renderWaveformRegions();
    });

    // Allow smooth horizontal scrolling with mouse wheel
    this.waveformContainer.addEventListener("wheel", (e) => {
      const scrollEl = this.waveformContainer.querySelector("[part='scroll']") || this.waveformContainer;
      if (scrollEl && scrollEl.scrollWidth > scrollEl.clientWidth) {
        e.preventDefault();
        scrollEl.scrollLeft += (e.deltaY || e.deltaX) * 1.5;
      }
    }, { passive: false });
  }

  renderWaveformRegions() {
    if (!this.wsRegions || !this.currentTranscript) return;
    this.wsRegions.clearRegions();

    const segments = this.currentTranscript.segments || [];
    segments.forEach((seg) => {
      const color = seg.speaker_color || "#38bdf8";
      // Convert hex to semi-transparent rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const rgbaColor = `rgba(${r}, ${g}, ${b}, 0.28)`;

      const region = this.wsRegions.addRegion({
        id: `reg_${seg.id}`,
        start: seg.start,
        end: seg.end,
        color: rgbaColor,
        drag: false,
        resize: false
      });

      if (region.element) {
        region.element.classList.add("speaker-timeline-region");
        region.element.dataset.turnId = seg.id;
        region.element.dataset.speakerColor = color;
        // Fix: ID must only be displayed in popup, NOT in timeline!
        region.element.setAttribute("title", `${seg.speaker_label} (${this.formatTime(seg.start)} - ${this.formatTime(seg.end)})`);

        // Add clean speaker label badge to region with squircle Cameo avatar (styled inline for Shadow DOM)
        const avatarUrl = this.getDicebearAvatarUrl(seg.speaker_avatar_seed || seg.speaker_label || seg.speaker_id, color);
        const darkBg = window.CameoAvatar ? window.CameoAvatar.toDarkShade(color) : color;
        const lbl = document.createElement("span");
        lbl.className = "timeline-region-label";
        lbl.style.cssText = "position:absolute;top:3px;left:4px;display:inline-flex;align-items:center;gap:4px;padding:1px 5px 1px 2px;border-radius:4px;background:rgba(3,7,18,0.88);pointer-events:none;max-width:90%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:10;";
        lbl.innerHTML = `
          <span class="speaker-avatar-wrap" style="width:14px;height:14px;border-radius:28%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border:none!important;box-shadow:none!important;background:${darkBg};">
            <img class="speaker-avatar-img" src="${avatarUrl}" alt="${this.escapeHtml(seg.speaker_label)}" style="width:14px;height:14px;border-radius:28%;object-fit:cover;display:block;border:none!important;box-shadow:none!important;" />
          </span>
          <span class="timeline-region-name" style="color:${color};font-size:10px;font-weight:700;font-family:sans-serif;letter-spacing:0.03em;text-transform:uppercase;">${this.escapeHtml(seg.speaker_label)}</span>
        `;
        region.element.appendChild(lbl);
      }
    });

    // Click on timeline region to seek directly to that speaker turn
    this.wsRegions.on("region-clicked", (region, e) => {
      e.stopPropagation();
      this.mediaVideo.currentTime = region.start;
      this.mediaVideo.play();
    });
  }

  // --- Playback Controls ---
  togglePlayback() {
    if (!this.mediaVideo || !this.mediaVideo.src) return;
    if (this.mediaVideo.paused) {
      const p = this.mediaVideo.play();
      if (p && typeof p.catch === "function") {
        p.catch((err) => {
          console.warn("Playback prevented by browser policy:", err);
        });
      }
    } else {
      this.mediaVideo.pause();
    }
  }

  updatePlayIcon(isPlaying) {
    if (isPlaying) {
      if (this.playIcon) this.playIcon.classList.add("hidden");
      if (this.pauseIcon) this.pauseIcon.classList.remove("hidden");
      if (this.vPlayIcon) this.vPlayIcon.classList.add("hidden");
      if (this.vPauseIcon) this.vPauseIcon.classList.remove("hidden");
    } else {
      if (this.playIcon) this.playIcon.classList.remove("hidden");
      if (this.pauseIcon) this.pauseIcon.classList.add("hidden");
      if (this.vPlayIcon) this.vPlayIcon.classList.remove("hidden");
      if (this.vPauseIcon) this.vPauseIcon.classList.add("hidden");
    }
  }

  toggleMute() {
    this.mediaVideo.muted = !this.mediaVideo.muted;
    this.updateVolumeIcon();
  }

  updateVolumeIcon() {
    const isMuted = this.mediaVideo.muted || this.mediaVideo.volume === 0;
    if (this.volHighIcon && this.volMuteIcon) {
      this.volHighIcon.classList.toggle("hidden", isMuted);
      this.volMuteIcon.classList.toggle("hidden", !isMuted);
    }
    if (this.vVolumeSlider && !this.mediaVideo.muted && this.mediaVideo.volume > 0) {
      this.vVolumeSlider.value = this.mediaVideo.volume;
    }
  }

  toggleFullscreen() {
    const target = this.videoWrapper || this.mediaVideo;
    const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement || this.videoWrapper?.classList.contains("is-fullscreen"));
    if (!isFs) {
      if (this.videoWrapper) this.videoWrapper.classList.add("is-fullscreen");
      if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {});
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      }
    } else {
      if (this.videoWrapper) this.videoWrapper.classList.remove("is-fullscreen");
      if (document.exitFullscreen && (document.fullscreenElement || document.webkitFullscreenElement)) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen && (document.fullscreenElement || document.webkitFullscreenElement)) {
        document.webkitExitFullscreen();
      }
    }
  }

  toggleCaptions() {
    if (this.captionMode === "off") {
      this.setCaptionMode(this.lastCaptionMode || "regular");
    } else {
      this.lastCaptionMode = this.captionMode;
      this.setCaptionMode("off");
    }
  }

  setCaptionMode(mode) {
    this.captionMode = mode;
    localStorage.setItem("whosaid_caption_mode", mode);
    this.captionsVisible = (mode !== "off");

    if (this.btnToggleCaptions) {
      this.btnToggleCaptions.classList.toggle("active", this.captionsVisible);
    }

    if (this.captionModeDropdown) {
      this.captionModeDropdown.querySelectorAll(".caption-mode-item").forEach((b) => {
        b.classList.toggle("active", b.dataset.mode === mode);
      });
    }

    if (mode === "minimal") {
      if (this.captionOverlay) this.captionOverlay.classList.add("hidden");
      if (this.playerCcOverlay) this.playerCcOverlay.classList.add("hidden");
      if (this.activeTurnId && this.playerMinimalCaption) {
        this.playerMinimalCaption.classList.remove("hidden");
      }
      this.showToast("Caption style: Minimal (<Avatar><Name>)", "info");
    } else if (mode === "regular") {
      if (this.playerMinimalCaption) this.playerMinimalCaption.classList.add("hidden");
      if (this.captionOverlay) this.captionOverlay.classList.remove("hidden");
      this.showToast("Caption style: Regular Subtitles (Default)", "info");
    } else {
      if (this.playerMinimalCaption) this.playerMinimalCaption.classList.add("hidden");
      if (this.captionOverlay) this.captionOverlay.classList.add("hidden");
      if (this.playerCcOverlay) this.playerCcOverlay.classList.add("hidden");
      this.showToast("Captions hidden", "info");
    }
  }

  adjustVolume(delta) {
    if (!this.mediaVideo) return;
    const current = this.mediaVideo.muted ? 0 : this.mediaVideo.volume;
    let next = Math.max(0, Math.min(1, Math.round((current + delta) * 10) / 10));
    this.mediaVideo.volume = next;
    this.mediaVideo.muted = (next === 0);
    this.updateVolumeIcon();
    if (this.vVolumeSlider) {
      this.vVolumeSlider.value = next;
    }
  }

  seekDelta(delta) {
    if (this.mediaVideo.duration) {
      this.mediaVideo.currentTime = Math.max(
        0,
        Math.min(this.mediaVideo.duration, this.mediaVideo.currentTime + delta)
      );
    }
  }

  formatTime(seconds) {
    if (window.WhoSaidUtils && typeof window.WhoSaidUtils.formatTime === "function") {
      return window.WhoSaidUtils.formatTime(seconds);
    }
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  onTimeUpdate() {
    const curr = this.mediaVideo.currentTime;
    const dur = this.mediaVideo.duration || 0;

    const formattedCurr = this.formatTime(curr);
    const formattedDur = this.formatTime(dur);

    if (this.timeCurrent) this.timeCurrent.textContent = formattedCurr;
    if (this.timeDuration) this.timeDuration.textContent = formattedDur;
    if (this.vTimeCurrent) this.vTimeCurrent.textContent = formattedCurr;
    if (this.vTimeDuration) this.vTimeDuration.textContent = formattedDur;

    // Update segmented waveform seeker line and played bars
    if (dur > 0) {
      const pct = (curr / dur) * 100;
      if (this.waveformSeekerLine) {
        this.waveformSeekerLine.style.left = `calc(16px + (100% - 32px) * ${pct / 100})`;
      }
      if (this.waveformSegmentedTrack) {
        const bars = this.waveformSegmentedTrack.children;
        const totalBars = bars.length;
        if (totalBars > 0) {
          const activeIndex = Math.floor((curr / dur) * totalBars);
          for (let i = 0; i < totalBars; i++) {
            if (i <= activeIndex) {
              bars[i].classList.add("bar-played");
            } else {
              bars[i].classList.remove("bar-played");
            }
          }
        }
      }
    }

    // Sync captions, transcript cards, and timeline regions
    this.updateActiveSegment(curr);
  }

  updateActiveSegment(time) {
    if (!this.currentTranscript || !this.currentTranscript.segments) return;

    const segments = this.currentTranscript.segments;
    let activeSeg = null;

    // Find the active segment where speaker is actually speaking
    for (const seg of segments) {
      // Determine precise speech boundary based on word timestamps
      let speechEnd = seg.end;
      if (seg.words && seg.words.length > 0) {
        // Last word end with a small 0.1s margin
        speechEnd = seg.words[seg.words.length - 1].end + 0.1;
      }
      if (time >= seg.start && time <= speechEnd) {
        activeSeg = seg;
        break;
      }
    }

    if (activeSeg) {
      if (this.captionsVisible) {
        if (this.captionMode === "minimal") {
          // Minimal mode: show <Avatar><Name> in top left of video stage
          if (this.captionOverlay) this.captionOverlay.classList.add("hidden");
          if (this.playerCcOverlay) this.playerCcOverlay.classList.add("hidden");
          if (this.playerMinimalCaption) {
            this.playerMinimalCaption.classList.remove("hidden");
            if (this.currentActiveCaptionTurnId !== activeSeg.id) {
              this.currentActiveCaptionTurnId = activeSeg.id;
              const avatarHtml = this.getDicebearAvatarHtml(
                activeSeg.speaker_label,
                activeSeg.speaker_id,
                activeSeg.speaker_color || '#38bdf8',
                28,
                activeSeg.speaker_avatar_seed
              );
              if (this.minimalCaptionAvatar) this.minimalCaptionAvatar.innerHTML = avatarHtml;
              if (this.minimalCaptionSpeaker) {
                this.minimalCaptionSpeaker.textContent = activeSeg.speaker_label;
                const isLight = document.documentElement.classList.contains("light") || document.documentElement.getAttribute("data-theme") === "light";
                this.minimalCaptionSpeaker.style.color = isLight ? "#18181b" : "#ffffff";
              }
            }
          }
        } else if (this.captionMode === "regular") {
          // Regular mode (Default): show bottom subtitle banner & fullscreen CC
          if (this.playerMinimalCaption) this.playerMinimalCaption.classList.add("hidden");
          if (this.captionOverlay) this.captionOverlay.classList.remove("hidden");
          if (this.playerCcOverlay) this.playerCcOverlay.classList.remove("hidden");

          // If active speaker segment changed, update avatar, speaker name, and base word spans
          if (this.currentActiveCaptionTurnId !== activeSeg.id) {
            this.currentActiveCaptionTurnId = activeSeg.id;
            const avatarHtml = this.getDicebearAvatarHtml(
              activeSeg.speaker_label,
              activeSeg.speaker_id,
              activeSeg.speaker_color || '#38bdf8',
              38,
              activeSeg.speaker_avatar_seed
            );

            if (this.captionAvatarWrap) this.captionAvatarWrap.innerHTML = avatarHtml;
            if (this.playerCcAvatarWrap) this.playerCcAvatarWrap.innerHTML = avatarHtml;

            if (this.captionSpeakerTag) {
              this.captionSpeakerTag.textContent = activeSeg.speaker_label;
              this.captionSpeakerTag.style.color = activeSeg.speaker_color || '#ffffff';
            }
            if (this.playerCcSpeakerTag) {
              this.playerCcSpeakerTag.textContent = activeSeg.speaker_label;
              this.playerCcSpeakerTag.style.color = activeSeg.speaker_color || '#ffffff';
            }

            let baseTextHtml = "";
            if (activeSeg.words && activeSeg.words.length > 0) {
              baseTextHtml = activeSeg.words
                .map((w, idx) => `<span class="caption-word-span" data-idx="${idx}">${this.escapeHtml(w.word)}</span>`)
                .join(" ");
            } else {
              baseTextHtml = this.escapeHtml(activeSeg.text);
            }

            if (this.captionText) this.captionText.innerHTML = baseTextHtml;
            if (this.playerCcText) this.playerCcText.innerHTML = baseTextHtml;
          }

          // Word-to-word smooth transitions: active & spoken words in bright color, not spoken in dimmer color
          if (activeSeg.words && activeSeg.words.length > 0) {
            const updateWordHighlight = (container) => {
              if (!container) return;
              const spans = container.querySelectorAll(".caption-word-span");
              let activeSpanToScroll = null;
              spans.forEach((span, i) => {
                const w = activeSeg.words[i];
                if (!w) return;
                const isSpoken = time >= w.start;
                const isWordActive = time >= w.start && time <= (w.end + 0.05);
                span.classList.toggle("word-spoken", isSpoken);
                span.classList.toggle("word-active", isWordActive);
                if (isWordActive) activeSpanToScroll = span;
              });
              if (activeSpanToScroll) {
                activeSpanToScroll.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
              }
            };
            updateWordHighlight(this.captionText);
            updateWordHighlight(this.playerCcText);
          }
        }
      } else {
        if (this.playerMinimalCaption) this.playerMinimalCaption.classList.add("hidden");
        if (this.captionOverlay) this.captionOverlay.classList.add("hidden");
        if (this.playerCcOverlay) this.playerCcOverlay.classList.add("hidden");
      }

      // 2. Highlight Transcript Section (Section/Turn highlighting only - no word-for-word highlight)
      if (this.activeTurnId !== activeSeg.id) {
        document.querySelectorAll(".transcript-turn-card.active-turn").forEach((c) => c.classList.remove("active-turn"));

        const newCard = document.getElementById(activeSeg.id);
        if (newCard) {
          newCard.classList.add("active-turn");
          newCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        this.activeTurnId = activeSeg.id;
      }
    } else {
      // Speaker has ended their turn or currently in pause / silence!
      if (this.activeTurnId) {
        const prevCard = document.getElementById(this.activeTurnId);
        if (prevCard) {
          prevCard.classList.remove("active-turn");
        }
        this.activeTurnId = null;
      }

      // Ensure NO stray active-turn section remains highlighted
      document.querySelectorAll(".transcript-turn-card.active-turn").forEach((c) => c.classList.remove("active-turn"));

      this.currentActiveCaptionTurnId = null;
      if (this.playerMinimalCaption) this.playerMinimalCaption.classList.add("hidden");
      if (this.playerCcOverlay) this.playerCcOverlay.classList.add("hidden");

      // In default view: keep subtitle section under player VISIBLE even when there is no text/active speech, but blank!
      if (this.captionOverlay && this.captionsVisible && this.captionMode === "regular") {
        this.captionOverlay.classList.remove("hidden");
        if (this.captionText) {
          this.captionText.innerHTML = "";
        }
        if (this.captionSpeakerTag) {
          this.captionSpeakerTag.textContent = "";
        }
        if (this.captionAvatarWrap) {
          this.captionAvatarWrap.innerHTML = "";
        }
      }
    }

    // 4. Update speaker highlight on the timeline bar with respect to the active speaker
    const regionEls = this.waveformContainer.querySelectorAll(".speaker-timeline-region");
    regionEls.forEach((el) => {
      if (activeSeg && el.dataset.turnId === activeSeg.id) {
        el.classList.add("active-timeline-region");
      } else {
        el.classList.remove("active-timeline-region");
      }
    });

    // 5. Update DiceBear Gaze avatar animation: ONLY the active speaker animates when speaking
    const isPlaying = this.mediaVideo && !this.mediaVideo.paused && !this.mediaVideo.ended;
    const currentActiveSpeakerId = (activeSeg && isPlaying) ? (activeSeg.speaker_id || null) : null;

    if (this._lastAnimatedSpeakerId !== currentActiveSpeakerId) {
      this._lastAnimatedSpeakerId = currentActiveSpeakerId;
      document.querySelectorAll(".speaker-avatar-wrap.is-speaking").forEach((el) => {
        if (!currentActiveSpeakerId || el.dataset.speakerId !== currentActiveSpeakerId) {
          el.classList.remove("is-speaking");
        }
      });
      if (currentActiveSpeakerId) {
        document.querySelectorAll(`.speaker-avatar-wrap[data-speaker-id="${currentActiveSpeakerId}"]`).forEach((el) => {
          el.classList.add("is-speaking");
        });
      }
    }
  }

  // --- Render Transcript & Speakers ---
  renderTranscript(transcript) {
    this.currentTranscript = transcript;
    if (this.speakersList) this.speakersList.innerHTML = "";
    this.transcriptContainer.innerHTML = "";

    const rawSpeakers = transcript.speakers || [];
    const segments = transcript.segments || [];

    // Filter out speakers who speak 0 times (null speakers)
    const speakerTurns = {};
    segments.forEach((seg) => {
      if (seg.speaker_id && (seg.text || "").trim()) {
        speakerTurns[seg.speaker_id] = (speakerTurns[seg.speaker_id] || 0) + 1;
      }
    });
    const activeSpeakers = rawSpeakers.filter((s) => (speakerTurns[s.id] || 0) > 0);
    const speakers = activeSpeakers.length > 0 ? activeSpeakers : rawSpeakers;

    if (this.speakerCountBadge) {
      this.speakerCountBadge.textContent = `${speakers.length}`;
    }

    // 1. Render Clean Speaker Avatar Grid
    this.renderSpeakerAvatarGrid(speakers);

    // 2. Render Flat Segmented Waveform Timeline Bar in Player
    let totalDuration = transcript.duration || 0;
    if (!totalDuration && segments.length > 0) {
      totalDuration = segments.reduce((max, s) => Math.max(max, s.end || 0), 0);
    }
    if (!totalDuration && this.mediaVideo && this.mediaVideo.duration && !isNaN(this.mediaVideo.duration)) {
      totalDuration = this.mediaVideo.duration;
    }
    this.renderSegmentedWaveformTimeline(segments, totalDuration);

    // Initialize subtitle banner under player: always visible in default view (blank when empty)
    if (this.captionOverlay && this.captionsVisible) {
      this.captionOverlay.classList.remove("hidden");
      if (this.captionText && !this.activeTurnId) {
        this.captionText.innerHTML = "";
      }
      if (this.captionSpeakerTag && !this.activeTurnId) {
        this.captionSpeakerTag.textContent = "";
      }
      if (this.captionAvatarWrap && !this.activeTurnId) {
        this.captionAvatarWrap.innerHTML = "";
      }
    }

    // 3. Render Transcribe Turns Matching Compact Horizontal Row Design
    segments.forEach((seg, index) => {
      const card = document.createElement("div");
      card.className = "transcript-turn-card";
      card.id = seg.id;

      // Word spans
      let wordsHtml = "";
      if (seg.words && seg.words.length > 0) {
        wordsHtml = seg.words
          .map(
            (w) =>
              `<span class="word-span" data-start="${w.start}" data-end="${w.end}" title="${w.start}s - ${w.end}s">${this.escapeHtml(
                w.word
              )}</span>`
          )
          .join(" ");
      } else {
        wordsHtml = this.escapeHtml(seg.text);
      }

      const avatarHtml = this.getDicebearAvatarHtml(seg.speaker_label, seg.speaker_id, seg.speaker_color || '#f6c48f', 34, seg.speaker_avatar_seed);
      card.innerHTML = `
        <div class="turn-avatar-slot">
          ${avatarHtml}
        </div>
        <div class="turn-body">
          <div class="turn-meta-row">
            <div class="turn-meta-left">
              <span class="turn-speaker-name" style="color: ${seg.speaker_color || '#f6c48f'}">${this.escapeHtml(seg.speaker_label)}</span>
            </div>
            <div class="turn-meta-right">
              <span class="turn-timestamp" title="Click to jump to turn">${this.formatTime(seg.start)} - ${this.formatTime(seg.end)}</span>
            </div>
          </div>
          <div class="turn-content" contenteditable="true" spellcheck="false" title="Click to edit text">
            ${wordsHtml}
          </div>
        </div>
      `;

      // Jump to turn on timestamp click
      const timeBadge = card.querySelector(".turn-timestamp");
      if (timeBadge) {
        timeBadge.addEventListener("click", () => {
          this.mediaVideo.currentTime = seg.start;
          this.mediaVideo.play();
        });
      }

      // Jump to specific word on click
      card.querySelectorAll(".word-span").forEach((span) => {
        span.addEventListener("click", (e) => {
          e.stopPropagation();
          const start = parseFloat(span.getAttribute("data-start"));
          if (!isNaN(start)) {
            this.mediaVideo.currentTime = start;
            this.mediaVideo.play();
          }
        });
      });

      // Save inline edits (F8)
      const contentDiv = card.querySelector(".turn-content");
      contentDiv.addEventListener("blur", () => {
        const newText = contentDiv.innerText.trim();
        if (newText !== seg.text) {
          seg.text = newText;
          this.saveTranscriptEdits();
        }
      });

      this.transcriptContainer.appendChild(card);
    });
  }

  openTurnReassignMenu(anchorBtn, seg, turnNumber) {
    document.querySelectorAll(".turn-reassign-menu").forEach((m) => m.remove());

    const menu = document.createElement("div");
    menu.className = "turn-reassign-menu";

    const speakers = this.currentTranscript.speakers || [];
    menu.innerHTML = `
      <div class="turn-reassign-header">
        <span>Move Turn #${turnNumber}</span>
        <span style="font-size:10px;opacity:0.6;">Current: ${this.escapeHtml(seg.speaker_label)}</span>
      </div>
      <div class="turn-reassign-list" style="display:flex;flex-direction:column;gap:3px;max-height:190px;overflow-y:auto;">
        ${speakers.map((spk) => {
          const isCurrent = spk.id === seg.speaker_id;
          const avatarHtml = this.getDicebearAvatarHtml(spk.label, spk.id, spk.color || '#f6c48f', 22, spk.avatar_seed);
          return `
            <button type="button" class="reassign-speaker-opt ${isCurrent ? 'active' : ''}" data-speaker-id="${spk.id}">
              <div class="reassign-avatar-mini">${avatarHtml}</div>
              <span class="reassign-name" style="color:${spk.color || '#eaeaea'}">${this.escapeHtml(spk.label)}</span>
              ${isCurrent ? '<span style="font-size:10px;opacity:0.7;">(Current)</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
      <button type="button" class="reassign-new-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>+ Move to New Speaker...</span>
      </button>
    `;

    // Click on existing speaker
    menu.querySelectorAll(".reassign-speaker-opt").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const spkId = btn.dataset.speakerId;
        const targetSpk = (this.currentTranscript.speakers || []).find((s) => s.id === spkId);
        menu.remove();
        if (targetSpk && targetSpk.id !== seg.speaker_id) {
          await this.reassignTurnSpeaker(seg, targetSpk, turnNumber);
        }
      });
    });

    // Click "+ Move to New Speaker..."
    const newSpkBtn = menu.querySelector(".reassign-new-btn");
    if (newSpkBtn) {
      newSpkBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        menu.remove();
        const currentCount = (this.currentTranscript.speakers || []).length;
        const defaultName = `Speaker ${currentCount + 1}`;
        const name = prompt(`Enter name for new speaker:`, defaultName);
        if (!name || !name.trim()) return;

        const cleanName = name.trim();
        const newId = `spk_${Date.now()}`;
        const color = PALETTE[currentCount % PALETTE.length];
        const seed = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');

        const newSpeaker = {
          id: newId,
          label: cleanName,
          color: color,
          avatar_seed: seed
        };

        this.currentTranscript.speakers.push(newSpeaker);
        await this.reassignTurnSpeaker(seg, newSpeaker, turnNumber);
      });
    }

    const rect = anchorBtn.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - 260)}px`;
    menu.style.left = `${Math.max(10, Math.min(rect.left, window.innerWidth - 265))}px`;
    menu.style.zIndex = "9999999";
    document.body.appendChild(menu);

    const onOutsideClick = (e) => {
      if (!menu.contains(e.target) && e.target !== anchorBtn) {
        menu.remove();
        document.removeEventListener("pointerdown", onOutsideClick);
      }
    };
    setTimeout(() => {
      document.addEventListener("pointerdown", onOutsideClick);
    }, 10);
  }

  async reassignTurnSpeaker(seg, targetSpeaker, turnNumber) {
    seg.speaker_id = targetSpeaker.id;
    seg.speaker_label = targetSpeaker.label;
    seg.speaker_color = targetSpeaker.color;
    seg.speaker_avatar_seed = targetSpeaker.avatar_seed;

    await this.saveTranscriptEdits();
    this.renderTranscript(this.currentTranscript);
    this.renderSpeakerAvatarGrid(this.currentTranscript.speakers);
    this.renderWaveformRegions();
    if (this.activeFolderSpeakerId) {
      this.loadFolderSpeakersTable();
      this.selectFolderSpeaker(this.activeFolderSpeakerId);
    }
    this.showToast(`Moved Turn #${turnNumber} to ${targetSpeaker.label}`, "success");
  }

  // --- Render Clean Single-Row Speaker Avatar Grid (Max 4-5 items) ---
  renderSpeakerAvatarGrid(speakers) {
    if (!this.speakersAvatarGrid) return;
    this.speakersAvatarGrid.innerHTML = "";

    const total = speakers.length;
    // Single row: max 4-5 slots. If total > 5, show first 4 + (+N) pill in slot 5.
    const maxVisible = 5;
    const hasMore = total > maxVisible;
    const visibleSpeakers = hasMore ? speakers.slice(0, 4) : speakers.slice(0, maxVisible);

    visibleSpeakers.forEach((spk) => {
      const item = document.createElement("div");
      item.className = "speaker-grid-item";
      item.dataset.speakerId = spk.id;
      item.title = `Click to inspect & edit ${spk.label}`;

      const avatarHtml = this.getDicebearAvatarHtml(spk.label, spk.id, spk.color || '#f6c48f', 40, spk.avatar_seed);
      item.innerHTML = `
        <div class="speaker-grid-avatar">
          ${avatarHtml}
        </div>
        <span class="speaker-grid-name">${this.escapeHtml(spk.label)}</span>
      `;
      item.addEventListener("click", () => this.openSpeakerFolderModal(spk.id));
      this.speakersAvatarGrid.appendChild(item);
    });

    if (hasMore) {
      const moreCount = total - 4;
      const moreItem = document.createElement("div");
      moreItem.className = "speaker-grid-item speaker-grid-more";
      moreItem.title = `View all ${total} speakers`;
      moreItem.innerHTML = `
        <div class="speaker-grid-avatar more-avatar">+${moreCount}</div>
        <span class="speaker-grid-name">More</span>
      `;
      moreItem.addEventListener("click", () => this.openSpeakerFolderModal());
      this.speakersAvatarGrid.appendChild(moreItem);
    }
  }

  // --- Render Dynamic Waveform Timeline Bars in Video Player ---
  renderSegmentedWaveformTimeline(segments, duration) {
    if (!this.waveformSegmentedTrack) return;
    this.waveformSegmentedTrack.innerHTML = "";

    let totalDur = duration || (this.mediaVideo && this.mediaVideo.duration ? this.mediaVideo.duration : 0);
    if (!totalDur && segments && segments.length > 0) {
      totalDur = segments.reduce((max, s) => Math.max(max, s.end || 0), 0);
    }
    if (!totalDur || isNaN(totalDur) || totalDur <= 0) totalDur = 1;
    const NUM_BARS = 160;
    const peaks = this.currentAudioPeaks || [];
    const hasPeaks = peaks.length > 0;
    const sorted = segments ? [...segments].sort((a, b) => a.start - b.start) : [];

    for (let i = 0; i < NUM_BARS; i++) {
      const t = (i / NUM_BARS) * totalDur;
      const tEnd = ((i + 1) / NUM_BARS) * totalDur;

      // Find speaker segment overlapping with this bar's time window
      const seg = sorted.find((s) => t < s.end && tEnd > s.start);
      const isSpeech = !!seg;

      // Determine bar height percentage
      let heightPct = 10;
      if (!isSpeech) {
        // Silent / unmarked section: flat very little bar in expanded waveform
        heightPct = 10;
      } else if (hasPeaks) {
        const peakIdx = Math.min(peaks.length - 1, Math.floor((i / NUM_BARS) * peaks.length));
        const amp = Math.abs(peaks[peakIdx] || 0);
        heightPct = Math.max(35, Math.min(95, Math.round(amp * 100)));
      } else {
        // Organic audio waveform envelope for speech
        const wave1 = Math.sin(i * 0.42);
        const wave2 = Math.cos(i * 0.18);
        const wave3 = Math.sin(i * 0.85);
        heightPct = Math.max(35, Math.min(95, Math.round(40 + 46 * Math.abs(wave1 * wave2) + 10 * Math.abs(wave3))));
      }

      const bar = document.createElement("div");
      bar.className = `waveform-bar ${isSpeech ? "bar-speech" : "bar-unmarked"}`;
      bar.dataset.index = i;
      bar.dataset.start = t.toFixed(2);
      bar.dataset.end = tEnd.toFixed(2);
      bar.style.setProperty("--bar-h", `${heightPct}%`);

      if (isSpeech) {
        const spkColor = seg.speaker_color || "var(--amber-flame)";
        bar.style.setProperty("--speaker-color", spkColor);
        bar.style.backgroundColor = spkColor;
        bar.title = `${seg.speaker_label || 'Speaker'}: ${this.formatTime(seg.start)} - ${this.formatTime(seg.end)}`;
      } else {
        bar.title = `Ambient / Audio: ${this.formatTime(t)} - ${this.formatTime(tEnd)}`;
      }

      bar.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.mediaVideo) {
          this.mediaVideo.currentTime = t;
          this.mediaVideo.play();
        }
      });

      this.waveformSegmentedTrack.appendChild(bar);
    }
  }

  // --- Waveform Hover & Click Seekers ---
  handleWaveformHover(e) {
    const track = this.waveformSegmentedTrack || this.videoTimelineWaveformWrap;
    if (!track || !this.mediaVideo) return;
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const totalDur = (this.mediaVideo.duration && !isNaN(this.mediaVideo.duration))
      ? this.mediaVideo.duration
      : ((this.currentTranscript && this.currentTranscript.duration) || 1);
    const timeAtX = (x / rect.width) * totalDur;

    // Stagger wave animation radiating from cursor location
    if (this.waveformSegmentedTrack) {
      const bars = this.waveformSegmentedTrack.children;
      const totalBars = bars.length;
      if (totalBars > 0) {
        const cursorIdx = Math.floor((x / rect.width) * totalBars);
        if (this._lastStaggerIdx !== cursorIdx) {
          this._lastStaggerIdx = cursorIdx;
          for (let i = 0; i < totalBars; i++) {
            const dist = Math.abs(i - cursorIdx);
            const delay = Math.min(220, Math.round(dist * 2.2));
            bars[i].style.setProperty("--stagger-delay", `${delay}ms`);
          }
        }
      }
    }

    if (this.waveformTimelineTooltip) {
      const seg = (this.currentTranscript && this.currentTranscript.segments)
        ? this.currentTranscript.segments.find((s) => timeAtX >= s.start && timeAtX <= s.end)
        : null;

      let speakerInfoHtml = "";
      if (seg) {
        const spkName = seg.speaker_label || seg.speaker_id || "Speaker";
        const spkColor = seg.speaker_color || "var(--amber-flame)";
        const avatarHtml = this.getDicebearAvatarHtml(spkName, seg.speaker_id, spkColor, 16, seg.avatar_seed || spkName);
        speakerInfoHtml = `
          <span class="tooltip-speaker-divider"></span>
          <span class="tooltip-speaker-chip" style="color: ${spkColor}">
            ${avatarHtml}
            <span class="tooltip-speaker-name">${this.escapeHtml(spkName)}</span>
          </span>
        `;
      } else {
        speakerInfoHtml = `
          <span class="tooltip-speaker-divider"></span>
          <span class="tooltip-speaker-chip tooltip-ambient">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tooltip-ambient-icon">
              <path d="M2 10v4M6 6v12M10 3v18M14 7v10M18 5v14M22 10v4"></path>
            </svg>
            <span class="tooltip-speaker-name">Ambient</span>
          </span>
        `;
      }

      this.waveformTimelineTooltip.innerHTML = `
        <span class="tooltip-timestamp">${this.formatTime(timeAtX)}</span>
        ${speakerInfoHtml}
      `;

      const clampX = Math.max(50, Math.min(x + 16, rect.width - 50 + 16));
      this.waveformTimelineTooltip.style.left = `${clampX}px`;
      this.waveformTimelineTooltip.classList.remove("hidden");
    }
  }

  handleWaveformLeave() {
    this._lastStaggerIdx = null;
    if (this.waveformTimelineTooltip) {
      this.waveformTimelineTooltip.classList.add("hidden");
    }
    if (this.waveformSegmentedTrack) {
      const bars = this.waveformSegmentedTrack.children;
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.removeProperty("--stagger-delay");
      }
    }
  }

  handleWaveformClick(e) {
    const track = this.waveformSegmentedTrack || this.videoTimelineWaveformWrap;
    if (!track || !this.mediaVideo) return;
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const totalDur = (this.mediaVideo.duration && !isNaN(this.mediaVideo.duration))
      ? this.mediaVideo.duration
      : ((this.currentTranscript && this.currentTranscript.duration) || 1);
    const seekTime = (x / rect.width) * totalDur;

    this.mediaVideo.currentTime = seekTime;
    const pct = (x / rect.width) * 100;
    if (this.waveformSeekerLine) {
      this.waveformSeekerLine.style.left = `calc(16px + (100% - 32px) * ${pct / 100})`;
    }
    this.mediaVideo.play();
  }

  // --- Two-Column Speaker Directory & Folder Viewer Modal ---
  openSpeakerFolderModal(initialSpeakerId = null) {
    if (!this.speakerFolderModal || !this.currentTranscript) return;
    const segments = this.currentTranscript.segments || [];
    const speakerTurns = {};
    segments.forEach((seg) => {
      if (seg.speaker_id && (seg.text || "").trim()) {
        speakerTurns[seg.speaker_id] = (speakerTurns[seg.speaker_id] || 0) + 1;
      }
    });
    const activeSpeakers = (this.currentTranscript.speakers || []).filter((s) => (speakerTurns[s.id] || 0) > 0);
    const speakers = activeSpeakers.length > 0 ? activeSpeakers : (this.currentTranscript.speakers || []);
    if (speakers.length === 0) return;

    this.speakerFolderModal.classList.remove("hidden");
    const countBadge = document.getElementById("folderModalCountBadge");
    if (countBadge) countBadge.textContent = `${speakers.length} Speaker${speakers.length === 1 ? "" : "s"}`;

    this.renderFolderSpeakersTable(speakers, initialSpeakerId || speakers[0].id);
  }

  closeSpeakerFolderModal() {
    if (this.speakerFolderModal) {
      this.speakerFolderModal.classList.add("hidden");
    }
  }

  renderFolderSpeakersTable(speakers, selectSpeakerId = null) {
    if (!this.folderSpeakersTableBody) return;
    this.folderSpeakersTableBody.innerHTML = "";

    const segments = this.currentTranscript.segments || [];

    speakers.forEach((spk) => {
      const spkSegs = segments.filter((s) => s.speaker_id === spk.id);
      const totalDur = spkSegs.reduce((acc, s) => acc + (s.end - s.start), 0);

      const tr = document.createElement("tr");
      tr.className = "folder-table-row";
      tr.dataset.speakerId = spk.id;
      if (selectSpeakerId && spk.id === selectSpeakerId) {
        tr.classList.add("active-folder-row");
      }

      const avatarHtml = this.getDicebearAvatarHtml(spk.label, spk.id, spk.color, 24, spk.avatar_seed);
      tr.innerHTML = `
        <td>
          <div class="folder-cell-spk">
            <div class="folder-cell-avatar">${avatarHtml}</div>
            <span class="folder-cell-name">${this.escapeHtml(spk.label)}</span>
          </div>
        </td>
        <td class="folder-cell-meta">${spkSegs.length}</td>
        <td class="folder-cell-meta">${totalDur.toFixed(1)}s</td>
      `;

      tr.addEventListener("click", () => {
        document.querySelectorAll(".folder-table-row").forEach((r) => r.classList.remove("active-folder-row"));
        tr.classList.add("active-folder-row");
        this.selectFolderSpeaker(spk.id);
      });

      this.folderSpeakersTableBody.appendChild(tr);
    });

    const targetSpkId = selectSpeakerId || (speakers[0] ? speakers[0].id : null);
    if (targetSpkId) {
      this.selectFolderSpeaker(targetSpkId);
    }
  }

  selectFolderSpeaker(speakerId) {
    this.activeFolderSpeakerId = speakerId;
    if (!this.currentTranscript) return;

    const spk = (this.currentTranscript.speakers || []).find((s) => s.id === speakerId);
    if (!spk) return;

    const segments = (this.currentTranscript.segments || []).filter((s) => s.speaker_id === speakerId);

    // 1. Populate top profile card
    if (this.folderSpeakerNameInput) this.folderSpeakerNameInput.value = spk.label;
    if (this.folderSpeakerIdBadge) this.folderSpeakerIdBadge.textContent = spk.id;
    if (this.folderAvatarPreview) {
      this.folderAvatarPreview.innerHTML = this.getDicebearAvatarHtml(spk.label, spk.id, spk.color, 52, spk.avatar_seed);
    }

    // 2. Render color dots (10 unique pastel variants)
    if (this.folderColorRow) {
      this.folderColorRow.innerHTML = "";
      const colors = PALETTE;
      colors.forEach((col) => {
        const dot = document.createElement("span");
        dot.className = `folder-color-dot ${spk.color && spk.color.toLowerCase() === col.toLowerCase() ? "active" : ""}`;
        dot.style.backgroundColor = col;
        dot.title = `Color: ${col}`;
        dot.addEventListener("click", () => this.updateFolderSpeakerColor(spk, col));
        this.folderColorRow.appendChild(dot);
      });
    }

    // 3. Render Cameo preset seeds
    if (this.folderAvatarPresetsRow) {
      this.folderAvatarPresetsRow.innerHTML = "";
      const seeds = ["CameoOne", "CameoTwo", "CameoThree", "CameoFour", "CameoFive", "CameoSix"];
      seeds.forEach((seed) => {
        const seedBtn = document.createElement("div");
        seedBtn.className = `folder-preset-seed-btn ${(spk.avatar_seed || spk.label) === seed ? "active" : ""}`;
        seedBtn.innerHTML = this.getDicebearAvatarHtml(seed, spk.id, spk.color, 28, seed);
        seedBtn.addEventListener("click", () => this.updateFolderSpeakerSeed(spk, seed));
        this.folderAvatarPresetsRow.appendChild(seedBtn);
      });
    }

    // 4. Populate merge target select
    if (this.folderMergeTargetSelect) {
      this.folderMergeTargetSelect.innerHTML = "";
      const otherSpeakers = (this.currentTranscript.speakers || []).filter((s) => s.id !== speakerId);
      if (otherSpeakers.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No other speakers available to merge";
        opt.disabled = true;
        opt.selected = true;
        this.folderMergeTargetSelect.appendChild(opt);
        if (this.btnFolderExecuteMerge) this.btnFolderExecuteMerge.disabled = true;
      } else {
        otherSpeakers.forEach((other) => {
          const opt = document.createElement("option");
          opt.value = other.id;
          opt.textContent = `Merge with ${other.label}`;
          this.folderMergeTargetSelect.appendChild(opt);
        });
        if (this.btnFolderExecuteMerge) {
          this.btnFolderExecuteMerge.disabled = false;
        }
      }
    }

    // 5. Folder Viewer for turns (files in folder)
    if (this.folderTurnsCount) {
      this.folderTurnsCount.textContent = `(${segments.length} turn${segments.length === 1 ? "" : "s"})`;
    }
    if (this.folderTurnsList) {
      this.folderTurnsList.innerHTML = "";
      if (segments.length === 0) {
        this.folderTurnsList.innerHTML = '<div style="color:#64748b;font-size:0.8rem;padding:8px;">No dialogue turns assigned to this speaker.</div>';
      } else {
        segments.forEach((seg, idx) => {
          const globalTurnIdx = (this.currentTranscript.segments || []).indexOf(seg) + 1;
          const turnNumber = globalTurnIdx > 0 ? globalTurnIdx : (idx + 1);
          const item = document.createElement("div");
          item.className = "folder-turn-item";
          item.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="folder-turn-file-icon">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <div class="folder-turn-body">
              <div class="folder-turn-meta">
                <span class="folder-turn-badge">Turn #${turnNumber}</span>
                <span class="folder-turn-time">${this.formatTime(seg.start)} - ${this.formatTime(seg.end)}</span>
              </div>
              <p class="folder-turn-text">${this.escapeHtml(seg.text)}</p>
            </div>
            <div class="folder-turn-actions">
              <button type="button" class="btn-turn-jump" title="Play turn in player">▶ Play</button>
              <button type="button" class="btn-folder-move-turn" title="Move Turn #${turnNumber} to another speaker">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"></path></svg>
                <span>Move</span>
              </button>
            </div>
          `;
          item.querySelector(".btn-turn-jump").addEventListener("click", () => {
            if (this.mediaVideo) {
              this.mediaVideo.currentTime = seg.start;
              this.mediaVideo.play();
            }
          });
          const moveBtn = item.querySelector(".btn-folder-move-turn");
          if (moveBtn) {
            moveBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              this.openTurnReassignMenu(moveBtn, seg, turnNumber);
            });
          }
          this.folderTurnsList.appendChild(item);
        });
      }
    }
  }

  async updateFolderSpeakerColor(spk, newColor) {
    spk.color = newColor;
    if (this.currentTranscript) {
      (this.currentTranscript.segments || []).forEach((seg) => {
        if (seg.speaker_id === spk.id) seg.speaker_color = newColor;
      });
      try {
        await fetch(`/api/transcripts/${this.currentTranscript.id}/rename-speaker`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            speaker_id: spk.id,
            new_label: spk.label,
            color: newColor,
            avatar_seed: spk.avatar_seed || spk.label,
            enroll_profile: true
          })
        });
        this.fetchProfileCount();
      } catch (e) {
        await this.saveTranscriptEdits();
      }
      this.renderTranscript(this.currentTranscript);
      this.selectFolderSpeaker(spk.id);
      this.showToast(`Updated color for ${spk.label}`, "success");
    }
  }

  async updateFolderSpeakerSeed(spk, newSeed) {
    spk.avatar_seed = newSeed;
    if (this.currentTranscript) {
      (this.currentTranscript.segments || []).forEach((seg) => {
        if (seg.speaker_id === spk.id) seg.speaker_avatar_seed = newSeed;
      });
      try {
        await fetch(`/api/transcripts/${this.currentTranscript.id}/rename-speaker`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            speaker_id: spk.id,
            new_label: spk.label,
            color: spk.color,
            avatar_seed: newSeed,
            enroll_profile: true
          })
        });
        this.fetchProfileCount();
      } catch (e) {
        await this.saveTranscriptEdits();
      }
      this.renderTranscript(this.currentTranscript);
      this.selectFolderSpeaker(spk.id);
      this.showToast(`Updated Cameo avatar for ${spk.label}`, "success");
    }
  }

  async saveFolderSpeakerName() {
    if (!this.activeFolderSpeakerId || !this.currentTranscript) return;
    const newName = (this.folderSpeakerNameInput ? this.folderSpeakerNameInput.value.trim() : "");
    if (!newName) return;

    const spk = (this.currentTranscript.speakers || []).find((s) => s.id === this.activeFolderSpeakerId);
    if (!spk) return;

    spk.label = newName;
    (this.currentTranscript.segments || []).forEach((seg) => {
      if (seg.speaker_id === spk.id) seg.speaker_label = newName;
    });

    try {
      const resp = await fetch(`/api/transcripts/${this.currentTranscript.id}/rename-speaker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speaker_id: spk.id,
          new_label: newName,
          color: spk.color,
          avatar_seed: spk.avatar_seed || newName,
          enroll_profile: true
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.speakers) {
          this.currentTranscript.speakers = data.speakers;
        }
        this.fetchProfileCount();
        this.showToast(`Saved "${newName}" to Enrolled Voice Profiles!`, "success");
      } else {
        await this.saveTranscriptEdits();
        this.showToast(`Renamed to "${newName}"`, "success");
      }
    } catch (e) {
      await this.saveTranscriptEdits();
      this.showToast(`Renamed to "${newName}"`, "success");
    }

    this.renderTranscript(this.currentTranscript);
    this.renderFolderSpeakersTable(this.currentTranscript.speakers || [], spk.id);
  }

  async executeFolderMerge() {
    if (!this.activeFolderSpeakerId || !this.folderMergeTargetSelect || !this.currentTranscript) return;
    const targetId = this.folderMergeTargetSelect.value;
    if (!targetId || targetId === this.activeFolderSpeakerId) return;

    const sourceSpk = (this.currentTranscript.speakers || []).find((s) => s.id === this.activeFolderSpeakerId);
    const targetSpk = (this.currentTranscript.speakers || []).find((s) => s.id === targetId);

    try {
      const resp = await fetch(`/api/transcripts/${this.currentTranscript.id}/merge-speakers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_speaker_id: this.activeFolderSpeakerId,
          target_speaker_id: targetId
        })
      });
      const updated = await resp.json();
      if (resp.ok && updated.speakers) {
        this.currentTranscript.speakers = updated.speakers;
        this.currentTranscript.segments = updated.segments;
        this.renderTranscript(this.currentTranscript);
        this.renderWaveformRegions();

        // Update tabs cache
        const tab = this.openTabs.find((t) => t.id === this.activeTabId);
        if (tab && tab.transcript) {
          tab.transcript.speakers = updated.speakers;
          tab.transcript.segments = updated.segments;
        }

        const nextActiveId = (updated.speakers || []).some((s) => s.id === targetId) ? targetId : (updated.speakers[0]?.id || null);
        this.renderFolderSpeakersTable(updated.speakers || [], nextActiveId);
        if (nextActiveId) this.selectFolderSpeaker(nextActiveId);
        this.showToast(`Merged ${sourceSpk ? sourceSpk.label : 'speaker'} into ${targetSpk ? targetSpk.label : 'target'}`, "success");
      } else {
        this.showToast(updated.detail || "Failed to merge speakers", "error");
      }
    } catch (e) {
      this.showToast("Failed to merge speakers", "error");
    }
  }

  filterFolderSpeakers(query) {
    if (!this.folderSpeakersTableBody) return;
    const q = (query || "").toLowerCase().trim();
    const rows = this.folderSpeakersTableBody.querySelectorAll(".folder-table-row");
    rows.forEach((row) => {
      const name = row.querySelector(".folder-cell-name") ? row.querySelector(".folder-cell-name").textContent.toLowerCase() : "";
      if (!q || name.includes(q)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  }

  // --- Save Inline Edits ---
  async saveTranscriptEdits() {
    if (!this.currentTranscript) return;
    try {
      const resp = await fetch(`/api/transcripts/${this.currentTranscript.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speakers: this.currentTranscript.speakers,
          segments: this.currentTranscript.segments
        })
      });
      if (resp.ok) {
        this.showToast("Transcript edits saved", "success");
      }
    } catch (e) {
      console.error("Save edits error:", e);
    }
  }

  // --- Rename Speaker Modal (F5 & Cameo Avatar Selection) ---
  buildColorPicker() {
    this.colorPickerGroup.innerHTML = "";
    PALETTE.forEach((c) => {
      const opt = document.createElement("div");
      opt.className = "color-option";
      opt.style.backgroundColor = c;
      opt.title = `Color: ${c}`;
      opt.addEventListener("click", () => {
        this.selectedRenameColor = c;
        this.colorPickerGroup.querySelectorAll(".color-option").forEach((el) => el.classList.remove("selected"));
        opt.classList.add("selected");
        this.renderAvatarPicker();
        this.updateRenameAvatarPreview();
      });
      this.colorPickerGroup.appendChild(opt);
    });
  }

  renderAvatarPicker() {
    if (!this.avatarPickerGroup) return;
    this.avatarPickerGroup.innerHTML = "";
    CAMEO_PRESETS.forEach((presetSeed) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "avatar-preset-btn" + (this.selectedAvatarSeed.toLowerCase() === presetSeed.toLowerCase() ? " selected" : "");
      btn.title = `Avatar: ${presetSeed}`;
      btn.innerHTML = this.getDicebearAvatarHtml(presetSeed, presetSeed, this.selectedRenameColor, 36, presetSeed);
      btn.addEventListener("click", () => {
        this.selectedAvatarSeed = presetSeed;
        if (this.avatarSeedInput) this.avatarSeedInput.value = presetSeed;
        this.avatarPickerGroup.querySelectorAll(".avatar-preset-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.updateRenameAvatarPreview();
      });
      this.avatarPickerGroup.appendChild(btn);
    });
  }

  updateRenameAvatarPreview() {
    if (!this.renameAvatarPreview || !this.speakerToRename) return;
    const nameVal = this.speakerNameInput.value.trim() || this.speakerToRename.label;
    const seed = this.selectedAvatarSeed || nameVal || this.speakerToRename.id;
    this.renameAvatarPreview.innerHTML = this.getDicebearAvatarHtml(nameVal, this.speakerToRename.id, this.selectedRenameColor, 52, seed);
  }

  openRenameModal(speaker) {
    this.speakerToRename = speaker;
    this.speakerNameInput.value = speaker.label;
    this.selectedRenameColor = speaker.color || PALETTE[0];
    this.selectedAvatarSeed = speaker.avatar_seed || speaker.label || speaker.id || "Felix";

    if (this.avatarSeedInput) {
      this.avatarSeedInput.value = speaker.avatar_seed || "";
      this.avatarSeedInput.oninput = () => {
        const val = this.avatarSeedInput.value.trim();
        if (val) {
          this.selectedAvatarSeed = val;
          if (this.avatarPickerGroup) {
            this.avatarPickerGroup.querySelectorAll(".avatar-preset-btn").forEach((b) => {
              b.classList.toggle("selected", b.title.toLowerCase() === `avatar: ${val.toLowerCase()}`);
            });
          }
          this.updateRenameAvatarPreview();
        }
      };
    }

    this.renderAvatarPicker();
    this.updateRenameAvatarPreview();

    if (this.renameSpeakerIdTag) {
      this.renameSpeakerIdTag.textContent = speaker.id;
    }
    if (this.renameSpeakerTurnsInfo && this.currentTranscript) {
      const count = (this.currentTranscript.segments || []).filter((s) => s.speaker_id === speaker.id).length;
      this.renameSpeakerTurnsInfo.textContent = `${count} dialogue turn${count === 1 ? "" : "s"} across session`;
    }

    // Live update avatar preview when user types name
    this.speakerNameInput.oninput = () => {
      this.updateRenameAvatarPreview();
    };

    // Highlight selected color
    this.colorPickerGroup.querySelectorAll(".color-option").forEach((opt) => {
      opt.classList.toggle("selected", opt.style.backgroundColor === this.selectedRenameColor);
    });

    this.renameModal.classList.remove("hidden");
    this.speakerNameInput.focus();
  }

  closeRenameModal() {
    this.renameModal.classList.add("hidden");
    this.speakerToRename = null;
  }

  async saveSpeakerRename() {
    if (!this.speakerToRename || !this.currentTranscript) return;
    const newName = this.speakerNameInput.value.trim();
    if (!newName) {
      this.showToast("Please enter a speaker name", "error");
      return;
    }

    const enrollProfile = this.enrollVoiceCheckbox.checked;

    try {
      const resp = await fetch(`/api/transcripts/${this.currentTranscript.id}/rename-speaker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speaker_id: this.speakerToRename.id,
          new_label: newName,
          color: this.selectedRenameColor,
          avatar_seed: this.selectedAvatarSeed,
          enroll_profile: enrollProfile
        })
      });

      const res = await resp.json();
      if (resp.ok) {
        this.showToast(res.message, "success");
        this.closeRenameModal();
        // Reload transcript data to re-render cleanly
        this.loadTranscript(this.currentTranscript.id);
        this.fetchProfileCount();
      } else {
        this.showToast(res.detail || "Rename failed", "error");
      }
    } catch (e) {
      this.showToast("Error renaming speaker", "error");
    }
  }

  // --- Merge Misclassified Speakers Modal ---
  openMergeModal(preferredSourceId = null) {
    if (!this.currentTranscript || !this.currentTranscript.speakers || this.currentTranscript.speakers.length < 2) {
      this.showToast("At least 2 speakers are required to merge", "info");
      return;
    }

    const speakers = this.currentTranscript.speakers;
    const segments = this.currentTranscript.segments || [];

    // Calculate turns count for each speaker
    const turnCounts = {};
    segments.forEach((s) => {
      turnCounts[s.speaker_id] = (turnCounts[s.speaker_id] || 0) + 1;
    });

    // Populate source and target dropdowns
    this.mergeSourceSelect.innerHTML = "";
    this.mergeTargetSelect.innerHTML = "";

    speakers.forEach((s) => {
      const count = turnCounts[s.id] || 0;
      const opt1 = document.createElement("option");
      opt1.value = s.id;
      opt1.textContent = `${s.id}: ${s.label} (${count} turn${count === 1 ? "" : "s"})`;
      this.mergeSourceSelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = s.id;
      opt2.textContent = `${s.id}: ${s.label} (${count} turn${count === 1 ? "" : "s"})`;
      this.mergeTargetSelect.appendChild(opt2);
    });

    // Determine default selections
    if (preferredSourceId && speakers.some((s) => s.id === preferredSourceId)) {
      this.mergeSourceSelect.value = preferredSourceId;
      // Select the first different speaker as target
      const other = speakers.find((s) => s.id !== preferredSourceId);
      if (other) this.mergeTargetSelect.value = other.id;
    } else {
      // Pick first two distinct speakers
      this.mergeSourceSelect.value = speakers[1] ? speakers[1].id : speakers[0].id;
      this.mergeTargetSelect.value = speakers[0].id;
    }

    this.updateMergePreview();
    this.mergeModal.classList.remove("hidden");
  }

  closeMergeModal() {
    if (this.mergeModal) {
      this.mergeModal.classList.add("hidden");
    }
  }

  updateMergePreview() {
    if (!this.currentTranscript) return;
    const sourceId = this.mergeSourceSelect.value;
    const targetId = this.mergeTargetSelect.value;
    const speakers = this.currentTranscript.speakers || [];
    const segments = this.currentTranscript.segments || [];

    const sourceSpk = speakers.find((s) => s.id === sourceId);
    const targetSpk = speakers.find((s) => s.id === targetId);

    if (sourceSpk && this.mergePreviewSource) {
      this.mergePreviewSource.innerHTML = `
        ${this.getDicebearAvatarHtml(sourceSpk.label, sourceSpk.id, sourceSpk.color, 36)}
        <div class="spk-preview-meta">
          <span class="spk-name">${this.escapeHtml(sourceSpk.label)}</span>
          <span class="spk-popup-id-tag">ID: <code>${sourceSpk.id}</code></span>
        </div>
      `;
    }

    if (targetSpk && this.mergePreviewTarget) {
      this.mergePreviewTarget.innerHTML = `
        ${this.getDicebearAvatarHtml(targetSpk.label, targetSpk.id, targetSpk.color, 36)}
        <div class="spk-preview-meta">
          <span class="spk-name">${this.escapeHtml(targetSpk.label)}</span>
          <span class="spk-popup-id-tag">ID: <code>${targetSpk.id}</code></span>
        </div>
      `;
    }

    const turnsCount = segments.filter((s) => s.speaker_id === sourceId).length;

    if (sourceId === targetId) {
      this.mergeTurnsCountText.textContent = "Cannot merge a speaker into itself. Please select two different speakers.";
      this.mergeTurnsCountText.style.color = "var(--danger)";
      this.btnConfirmMerge.disabled = true;
    } else {
      this.mergeTurnsCountText.textContent = `${turnsCount} dialogue turn${turnsCount === 1 ? "" : "s"} will be reassigned from ${sourceSpk ? sourceSpk.id : sourceId} to ${targetSpk ? targetSpk.id : targetId}.`;
      this.mergeTurnsCountText.style.color = "var(--text-muted)";
      this.btnConfirmMerge.disabled = false;
    }
  }

  async executeMergeSpeakers() {
    if (!this.currentTranscript) return;
    const sourceId = this.mergeSourceSelect.value;
    const targetId = this.mergeTargetSelect.value;

    if (!sourceId || !targetId || sourceId === targetId) {
      this.showToast("Please choose two different speakers to merge", "error");
      return;
    }

    this.btnConfirmMerge.disabled = true;
    try {
      const resp = await fetch(`/api/transcripts/${this.currentTranscript.id}/merge-speakers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_speaker_id: sourceId,
          target_speaker_id: targetId
        })
      });

      const res = await resp.json();
      if (resp.ok) {
        this.showToast(res.message, "success");
        this.closeMergeModal();

        // Update local transcript data and re-render
        this.currentTranscript.speakers = res.speakers;
        this.currentTranscript.segments = res.segments;

        // Update tabs cache
        const tab = this.openTabs.find((t) => t.id === this.activeTabId);
        if (tab && tab.transcript) {
          tab.transcript.speakers = res.speakers;
          tab.transcript.segments = res.segments;
        }

        this.renderTranscript(this.currentTranscript);
        this.renderWaveformRegions();

        if (this.speakerFolderModal && !this.speakerFolderModal.classList.contains("hidden")) {
          const nextActiveId = (res.speakers || []).some((s) => s.id === targetId) ? targetId : (res.speakers[0]?.id || null);
          this.renderFolderSpeakersTable(res.speakers || [], nextActiveId);
          if (nextActiveId) this.selectFolderSpeaker(nextActiveId);
        }
      } else {
        this.showToast(res.detail || "Merge failed", "error");
      }
    } catch (e) {
      console.error("Merge error:", e);
      this.showToast("Error merging speakers", "error");
    } finally {
      this.btnConfirmMerge.disabled = false;
    }
  }

  // --- Voice Profiles Tab (F4) ---
  async openProfilesModal() {
    this.showProfilesView();
  }

  closeProfilesModal() {
    if (this.currentTranscript) {
      this.showWorkspaceView();
    } else {
      this.showHomeView();
    }
  }

  async fetchProfileCount() {
    try {
      const resp = await fetch("/api/profiles");
      if (resp.ok) {
        const list = await resp.json();
        this.profileCountBadge.textContent = list.length;
        this.modalProfileCount.textContent = list.length;
      }
    } catch (e) {}
  }

  async loadVoiceProfilesList() {
    if (!this.enrolledProfilesTableBody) {
      this.enrolledProfilesTableBody = document.getElementById("enrolledProfilesTableBody");
    }
    if (!this.enrolledProfilesEmpty) {
      this.enrolledProfilesEmpty = document.getElementById("enrolledProfilesEmpty");
    }
    if (this.enrolledProfilesTableBody) {
      this.enrolledProfilesTableBody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-text-muted">Loading enrolled voice profiles...</td></tr>';
    }
    try {
      const resp = await fetch("/api/profiles");
      if (!resp.ok) return;
      const list = await resp.json();
      this.allVoiceProfiles = list || [];

      if (this.profileCountBadge) this.profileCountBadge.textContent = this.allVoiceProfiles.length;
      if (this.modalProfileCount) this.modalProfileCount.textContent = this.allVoiceProfiles.length;

      const query = (this.profileSearchInput ? this.profileSearchInput.value : "").trim().toLowerCase();
      this.filterAndRenderVoiceProfiles(query);
    } catch (e) {
      if (this.enrolledProfilesTableBody) {
        this.enrolledProfilesTableBody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-red-400">Failed to load profiles.</td></tr>';
      }
    }
  }

  filterAndRenderVoiceProfiles(query = "") {
    if (!this.enrolledProfilesTableBody) {
      this.enrolledProfilesTableBody = document.getElementById("enrolledProfilesTableBody");
    }
    if (!this.enrolledProfilesEmpty) {
      this.enrolledProfilesEmpty = document.getElementById("enrolledProfilesEmpty");
    }
    const countEl = document.getElementById("modalProfileCount");
    if (countEl) {
      countEl.textContent = this.allVoiceProfiles ? this.allVoiceProfiles.length : 0;
    }
    if (!this.enrolledProfilesTableBody) return;

    let list = this.allVoiceProfiles || [];
    if (query) {
      list = list.filter((p) =>
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.id && p.id.toLowerCase().includes(query))
      );
    }

    this.enrolledProfilesTableBody.innerHTML = "";

    if (list.length === 0) {
      if (this.enrolledProfilesEmpty) this.enrolledProfilesEmpty.classList.remove("hidden");
      return;
    }

    if (this.enrolledProfilesEmpty) this.enrolledProfilesEmpty.classList.add("hidden");

    list.forEach((p) => {
      const tr = document.createElement("tr");
      tr.className = "profile-table-row hover:bg-surface-elevated/40 transition-colors";
      const avatarHtml = this.getDicebearAvatarHtml(p.name, p.id, p.color || "#f6c48f", 36, p.avatar_seed);

      let dateDisplay = "Just now";
      if (p.created_at || p.updated_at) {
        try {
          const d = new Date(p.created_at || p.updated_at);
          dateDisplay = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        } catch (e) {}
      }

      tr.innerHTML = `
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-surface-base border border-surface-border" style="border-left: 3px solid ${p.color || '#f6c48f'}">
              ${avatarHtml}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-semibold text-text-primary text-sm truncate">${this.escapeHtml(p.name)}</span>
              <span class="text-[11px] text-text-muted flex items-center gap-1.5">
                <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${p.color || '#f6c48f'}"></span>
                <span>Color: ${p.color || '#f6c48f'}</span>
              </span>
            </div>
          </div>
        </td>
        <td class="py-3 px-4 font-mono text-xs text-text-muted">
          <span class="px-2 py-0.5 rounded bg-surface-base border border-surface-border text-brand-300">
            ${(p.id || '').substring(0, 8)}...
          </span>
        </td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
            ${p.sample_count || 1} sample${(p.sample_count || 1) === 1 ? '' : 's'}
          </span>
        </td>
        <td class="py-3 px-4">
          <div class="flex flex-col">
            <span class="text-xs font-medium text-text-primary">192-dim 3D-Speaker</span>
            <span class="text-[11px] text-text-dim">CAMPPlus Hypersphere</span>
          </div>
        </td>
        <td class="py-3 px-4 text-xs text-text-muted whitespace-nowrap">
          ${dateDisplay}
        </td>
        <td class="py-3 px-4 text-right">
          <button class="btn-delete-profile inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors border border-red-500/20" title="Delete voice profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3.5 h-3.5">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>
        </td>
      `;

      const deleteBtn = tr.querySelector(".btn-delete-profile");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (confirm(`Remove voice profile for "${p.name}"?`)) {
            await fetch(`/api/profiles/${p.id}`, { method: "DELETE" });
            this.showToast(`Removed profile "${p.name}"`, "success");
            this.loadVoiceProfilesList();
            this.fetchProfileCount();
          }
        });
      }

      this.enrolledProfilesTableBody.appendChild(tr);
    });
  }

  async submitNewVoiceProfile() {
    const name = document.getElementById("newProfileName").value.trim();
    const fileInput = document.getElementById("newProfileAudio");
    const file = fileInput.files[0];

    if (!name || !file) {
      this.showToast("Please provide person name and an audio file", "error");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("color", PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    formData.append("audio_file", file);

    try {
      const resp = await fetch("/api/profiles", { method: "POST", body: formData });
      const res = await resp.json();
      if (resp.ok) {
        this.showToast(`Voice profile for "${name}" enrolled!`, "success");
        this.enrollNewProfileCard.classList.add("hidden");
        document.getElementById("newProfileName").value = "";
        fileInput.value = "";
        this.loadVoiceProfilesList();
        this.fetchProfileCount();
      } else {
        this.showToast(res.detail || "Enrollment failed", "error");
      }
    } catch (e) {
      this.showToast("Error enrolling voice profile", "error");
    }
  }

  // --- Upload Modal & Processing (F1, F9) ---
  openUploadModal() {
    this.uploadModal.classList.remove("hidden");
  }

  closeUploadModal() {
    this.uploadModal.classList.add("hidden");
    this.clearSelectedFile();
  }

  handleFileSelection(file) {
    if (!file) return;
    this.selectedFile = file;
    this.dropZone.classList.add("hidden");
    this.selectedFileInfo.classList.remove("hidden");
    this.selectedFileName.textContent = file.name;
    this.selectedFileSize.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    this.btnStartProcessing.disabled = false;
  }

  clearSelectedFile() {
    this.selectedFile = null;
    this.fileInput.value = "";
    this.dropZone.classList.remove("hidden");
    this.selectedFileInfo.classList.add("hidden");
    this.btnStartProcessing.disabled = true;
  }

  async startProcessingUpload() {
    if (!this.selectedFile) return;

    const modelSize = document.querySelector('input[name="modelSize"]:checked')?.value || "tiny";
    const langMode = document.querySelector('input[name="languageMode"]:checked')?.value || "en";
    const formData = new FormData();
    formData.append("file", this.selectedFile);
    formData.append("model_size", modelSize);
    formData.append("language_mode", langMode);

    this.closeUploadModal();
    this.openProgressModal();

    try {
      const resp = await fetch("/api/upload", { method: "POST", body: formData });
      const res = await resp.json();

      if (res.cached && res.transcript_id) {
        this.showToast(res.message, "success");
        this.closeProgressModal();
        this.loadTranscript(res.transcript_id);
      } else if (res.job_id) {
        this.subscribeJobProgress(res.job_id);
      }
    } catch (e) {
      this.closeProgressModal();
      this.showToast("Upload failed", "error");
    }
  }



  // --- Transcription History Tab (Feature 3) ---
  openHistoryModal() {
    this.showHistoryView();
  }

  closeHistoryModal() {
    if (this.currentTranscript) {
      this.showWorkspaceView();
    } else {
      this.showHomeView();
    }
  }

  // --- In-App Delete Confirmation Modal ---
  openDeleteConfirmModal(jobId, filename, onDeleted) {
    this.pendingDeleteJobId = jobId;
    this.pendingDeleteFilename = filename || "this session";
    this.pendingDeleteCallback = onDeleted;

    if (this.deleteConfirmFileName) {
      this.deleteConfirmFileName.textContent = `"${this.pendingDeleteFilename}"`;
    }
    if (this.deleteConfirmModal) {
      this.deleteConfirmModal.classList.remove("hidden");
    }
  }

  closeDeleteConfirmModal() {
    this.pendingDeleteJobId = null;
    this.pendingDeleteFilename = null;
    this.pendingDeleteCallback = null;
    if (this.deleteConfirmModal) {
      this.deleteConfirmModal.classList.add("hidden");
    }
  }

  async executeDeleteSession() {
    const jobId = this.pendingDeleteJobId;
    const filename = this.pendingDeleteFilename;
    const cb = this.pendingDeleteCallback;
    if (!jobId) return;

    try {
      if (this.btnExecuteDelete) {
        this.btnExecuteDelete.disabled = true;
        this.btnExecuteDelete.textContent = "Deleting...";
      }

      const resp = await fetch(`/api/history/${jobId}`, { method: "DELETE" });
      if (resp.ok) {
        this.showToast(`Removed "${filename}"`, "info");
        if (typeof cb === "function") cb();
        this.closeDeleteConfirmModal();

        await this.loadHomeRecentSessions();
        if (this.historyModal && !this.historyModal.classList.contains("hidden")) {
          await this.loadHistoryList();
        }

        // If the active workspace session was deleted, reset and return to home
        if (this.currentTranscript && this.currentTranscript.job_id === jobId) {
          this.currentTranscript = null;
          if (this.activeFileIndicator) this.activeFileIndicator.classList.add("hidden");
          if (this.mediaVideo) {
            this.mediaVideo.pause();
            this.mediaVideo.removeAttribute("src");
          }
          if (this.wavesurfer) {
            this.wavesurfer.destroy();
            this.wavesurfer = null;
          }
          this.showHomeView();
        }
      } else {
        this.showToast("Could not delete session from server", "error");
      }
    } catch (e) {
      console.error("Delete session error:", e);
      this.showToast("Network error deleting session", "error");
    } finally {
      if (this.btnExecuteDelete) {
        this.btnExecuteDelete.disabled = false;
        this.btnExecuteDelete.textContent = "Delete Permanently";
      }
    }
  }

  async loadHistoryList() {
    if (!this.historyListContainer) return;
    this.historyLoading.classList.remove("hidden");
    this.historyEmpty.classList.add("hidden");
    this.historyListContainer.innerHTML = "";

    try {
      const resp = await fetch("/api/history");
      const jobs = await resp.json();
      this.historyLoading.classList.add("hidden");

      if (!jobs || jobs.length === 0) {
        this.historyEmpty.classList.remove("hidden");
        this.updateHistoryBadges(0);
        return;
      }

      this.updateHistoryBadges(jobs.length);

      jobs.forEach((item) => {
        const card = document.createElement("div");
        card.className = "history-card";
        card.style.transition = "opacity 0.25s ease, transform 0.25s ease";

        const isTamilTranslate = item.language_mode === "ta_translate";
        const isTamil = item.language_mode === "ta";
        const langBadge = isTamilTranslate
          ? '<span class="lang-badge ta">Tamil → English</span>'
          : isTamil
          ? '<span class="lang-badge ta">Tamil (தமிழ்)</span>'
          : '<span class="lang-badge en">English</span>';

        const dateStr = item.created_at ? new Date(item.created_at).toLocaleString() : "Recently";
        const durStr = item.duration ? this.formatTime(item.duration) : "--:--";

        let speakersHtml = "";
        if (item.speakers && item.speakers.length > 0) {
          speakersHtml = item.speakers
            .map((s) => `<span class="history-speaker-pill" style="border-left: 2px solid ${s.color || '#38bdf8'}">${this.escapeHtml(s.name || s.label)}</span>`)
            .join("");
        } else {
          speakersHtml = `<span class="history-speaker-pill">${item.speaker_count || 0} speakers</span>`;
        }

        card.innerHTML = `
          <div class="history-card-header">
            <span class="history-card-title" title="${this.escapeHtml(item.filename)}">${this.escapeHtml(item.filename || "Video Session")}</span>
            <div class="history-badge-group">
              ${langBadge}
            </div>
          </div>
          <div class="history-meta-row">
            <div class="history-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${durStr}</span>
            </div>
            <div class="history-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${dateStr}</span>
            </div>
            <div class="history-meta-item">
              <span>Model: <strong>${item.model_size || "tiny"}</strong></span>
            </div>
          </div>
          <div class="history-card-footer">
            <div class="history-speakers-list">
              ${speakersHtml}
            </div>
            <div class="history-actions">
              <button class="btn btn-sm btn-outline btn-delete-history" title="Delete session from history" style="color:#ef4444;border-color:rgba(239,68,68,0.3);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete
              </button>
              <button class="btn btn-sm btn-primary btn-load-history">
                Load Session
              </button>
            </div>
          </div>
        `;

        card.querySelector(".btn-load-history").addEventListener("click", () => {
          if (item.transcript_id) {
            this.loadTranscript(item.transcript_id);
            this.closeHistoryModal();
          }
        });

        card.querySelector(".btn-delete-history").addEventListener("click", (e) => {
          e.stopPropagation();
          this.openDeleteConfirmModal(item.job_id, item.filename, () => {
            card.style.opacity = "0";
            card.style.transform = "scale(0.95)";
            setTimeout(() => card.remove(), 250);
          });
        });

        this.historyListContainer.appendChild(card);
      });
    } catch (e) {
      console.error(e);
      this.historyLoading.classList.add("hidden");
      this.showToast("Error fetching history", "error");
    }
  }

  // --- Real-time Progress Tracking (F9) ---
  openProgressModal() {
    this.progressModal.classList.remove("hidden");
    this.progressBarFill.style.width = "5%";
    this.progressPercent.textContent = "5%";
    this.progressMessage.textContent = "Initializing pipeline...";
    this.resetPipelineSteps();
  }

  closeProgressModal() {
    this.progressModal.classList.add("hidden");
  }

  resetPipelineSteps() {
    document.querySelectorAll(".step-item").forEach((el) => {
      el.className = "step-item";
    });
    document.getElementById("step-extract").classList.add("active");
  }

  updatePipelineSteps(status) {
    const steps = ["step-extract", "step-diarize", "step-transcribe", "step-align"];
    const statusMap = { extracting: 0, diarizing: 1, transcribing: 2, aligning: 3, completed: 4 };
    const activeIdx = statusMap[status] ?? -1;
    steps.forEach((id, idx) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (idx < activeIdx || (status === "completed")) {
        el.className = "step-item done";
      } else if (idx === activeIdx) {
        el.className = "step-item active";
      } else {
        el.className = "step-item";
      }
    });
  }

  stopProgressTracking() {
    if (this.progressPollInterval) {
      clearInterval(this.progressPollInterval);
      this.progressPollInterval = null;
    }
    if (this.websocket) {
      try {
        this.websocket.close();
      } catch (e) {}
      this.websocket = null;
    }
  }

  subscribeJobProgress(jobId) {
    this.currentJobId = jobId;
    this.stopProgressTracking();

    const handleUpdate = async (data) => {
      if (!data) return;
      const pct = data.progress !== undefined ? data.progress : 5;
      this.progressBarFill.style.width = `${pct}%`;
      this.progressPercent.textContent = `${Math.round(pct)}%`;
      this.progressMessage.textContent = data.message || "Processing...";
      this.updatePipelineSteps(data.status);

      if (data.status === "completed") {
        this.stopProgressTracking();
        setTimeout(async () => {
          this.closeProgressModal();
          try {
            const jobResp = await fetch(`/api/jobs/${jobId}`);
            const jobData = await jobResp.json();
            if (jobData.transcript_id) {
              this.loadTranscript(jobData.transcript_id);
            }
          } catch (err) {
            console.error("Error loading completed job:", err);
          }
        }, 300);
      } else if (data.status === "failed") {
        this.stopProgressTracking();
        this.showToast(`Error: ${data.message || "Pipeline failed"}`, "error");
        this.closeProgressModal();
      }
    };

    // 1. Immediate poll check
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then(handleUpdate)
      .catch(() => {});

    // 2. Active interval polling (ensures progress updates regardless of network/WS state)
    this.progressPollInterval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/jobs/${jobId}`);
        if (resp.ok) {
          const data = await resp.json();
          await handleUpdate(data);
        }
      } catch (e) {}
    }, 1000);

    // 3. WebSocket real-time channel
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws/${jobId}`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleUpdate(data);
        } catch (e) {}
      };
    } catch (e) {
      console.warn("WebSocket initialization fallback to polling:", e);
    }
  }

  // --- Load Full Transcript Workspace with Multi-Tab Support (Requirement 1) ---
  async loadTranscript(transcriptId) {
    try {
      const resp = await fetch(`/api/transcripts/${transcriptId}`);
      if (!resp.ok) {
        this.showToast("Could not load transcript", "error");
        return;
      }
      const data = await resp.json();
      this.openWorkspaceTab(data);
      this.applyActiveTranscript(data);
      this.showToast(data.media_available ? "Session loaded with video playback" : (data.audio_available ? "Session loaded with audio waveform" : "Transcript loaded"), "success");
    } catch (e) {
      console.error("loadTranscript error:", e);
      this.showToast("Error loading transcript", "error");
    }
  }

  openWorkspaceTab(data) {
    if (!data || !data.id) return;
    const existing = this.openTabs.find((t) => t.id === data.id);
    if (existing) {
      existing.data = data;
      existing.filename = data.filename || `Job ${data.job_id ? data.job_id.slice(0, 8) : "session"}`;
      existing.modelSize = data.model_size || "tiny";
      existing.duration = data.duration || 0;
    } else {
      this.openTabs.push({
        id: data.id,
        transcriptId: data.id,
        jobId: data.job_id,
        filename: data.filename || `Job ${data.job_id ? data.job_id.slice(0, 8) : "session"}`,
        modelSize: data.model_size || "tiny",
        duration: data.duration || 0,
        data: data
      });
    }
    this.activeTabId = data.id;
    this.renderWorkspaceTabs();
    this.updateOpenEditors();
  }

  renderWorkspaceTabs() {
    const container = document.getElementById("workspaceTabsContainer");
    if (!container) return;
    container.innerHTML = "";

    if (this.openTabs.length === 0) {
      if (this.workspaceEmptyTabsState) this.workspaceEmptyTabsState.classList.remove("hidden");
      if (this.workspacePlayerContainer) this.workspacePlayerContainer.classList.add("hidden");
      return;
    } else {
      if (this.workspaceEmptyTabsState) this.workspaceEmptyTabsState.classList.add("hidden");
      if (this.workspacePlayerContainer) this.workspacePlayerContainer.classList.remove("hidden");
    }

    this.openTabs.forEach((tab) => {
      const tabEl = document.createElement("div");
      tabEl.className = `workspace-tab ${tab.id === this.activeTabId ? "active" : ""}`;
      tabEl.dataset.tabId = tab.id;
      tabEl.title = tab.filename;

      tabEl.innerHTML = `
        <svg class="tab-media-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
        <span class="tab-label">${this.escapeHtml(tab.filename)}</span>
        <span class="tab-badge">${this.escapeHtml(tab.modelSize || "tiny")}</span>
        <button class="tab-close-btn" title="Close Tab (Ctrl+W)">&times;</button>
      `;

      tabEl.addEventListener("click", () => {
        this.switchWorkspaceTab(tab.id);
      });

      const closeBtn = tabEl.querySelector(".tab-close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.closeWorkspaceTab(tab.id);
        });
      }

      container.appendChild(tabEl);
    });

    const activeEl = container.querySelector(".workspace-tab.active");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }

  switchWorkspaceTab(tabId) {
    if (this.activeTabId === tabId) return;
    const tab = this.openTabs.find((t) => t.id === tabId);
    if (!tab) return;
    this.activeTabId = tabId;
    this.renderWorkspaceTabs();
    this.updateOpenEditors();
    if (tab.isUntranscribed) {
      this.applyUntranscribedMedia(tab.item);
    } else if (tab.data) {
      this.applyActiveTranscript(tab.data);
    } else {
      this.loadTranscript(tab.transcriptId);
    }
  }

  closeWorkspaceTab(tabId) {
    const idx = this.openTabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;

    const isClosingActive = this.activeTabId === tabId;
    this.openTabs.splice(idx, 1);

    if (isClosingActive) {
      if (this.openTabs.length > 0) {
        const nextIdx = Math.min(idx, this.openTabs.length - 1);
        const nextTab = this.openTabs[nextIdx];
        this.activeTabId = nextTab.id;
        this.renderWorkspaceTabs();
        this.updateOpenEditors();
        if (nextTab.isUntranscribed) {
          this.applyUntranscribedMedia(nextTab.item);
        } else if (nextTab.data) {
          this.applyActiveTranscript(nextTab.data);
        } else {
          this.loadTranscript(nextTab.transcriptId);
        }
      } else {
        this.activeTabId = null;
        this.currentTranscript = null;
        if (this.mediaVideo) {
          this.mediaVideo.pause();
          this.mediaVideo.removeAttribute("src");
        }
        if (this.untranscribedOptionsPanel) this.untranscribedOptionsPanel.classList.add("hidden");
        const rightToolbar = document.getElementById("workspaceRightToolbar");
        if (rightToolbar) rightToolbar.classList.remove("hidden");
        const spkPanel = document.querySelector(".speakers-panel");
        if (spkPanel) spkPanel.classList.remove("hidden");
        const trPanel = document.querySelector(".transcript-panel");
        if (trPanel) trPanel.classList.remove("hidden");
        if (this.transcriptContainer) this.transcriptContainer.innerHTML = "";
        if (this.speakersAvatarGrid) this.speakersAvatarGrid.innerHTML = "";
        if (this.waveformContainer) this.waveformContainer.innerHTML = "";
        if (this.navWorkspaceDot) this.navWorkspaceDot.classList.add("hidden");
        if (this.actBarWorkspaceDot) this.actBarWorkspaceDot.classList.add("hidden");
        if (this.activeFileIndicator) this.activeFileIndicator.classList.add("hidden");
        this.renderWorkspaceTabs();
        this.updateOpenEditors();
      }
    } else {
      this.renderWorkspaceTabs();
      this.updateOpenEditors();
    }
  }

  applyActiveTranscript(data) {
    this.currentTranscript = data;
    this.currentAudioPeaks = data.peaks || [];

    // Hide untranscribed panel, restore right toolbar & transcript
    if (this.untranscribedOptionsPanel) this.untranscribedOptionsPanel.classList.add("hidden");
    const rightToolbar = document.getElementById("workspaceRightToolbar");
    if (rightToolbar) rightToolbar.classList.remove("hidden");
    const spkPanel = document.querySelector(".speakers-panel");
    if (spkPanel) spkPanel.classList.remove("hidden");
    const trPanel = document.querySelector(".transcript-panel");
    if (trPanel) trPanel.classList.remove("hidden");

    // Hide empty tabs watermark, reveal player container
    if (this.workspaceEmptyTabsState) this.workspaceEmptyTabsState.classList.add("hidden");
    if (this.workspacePlayerContainer) this.workspacePlayerContainer.classList.remove("hidden");

    // Reset active turn tracking
    this.activeTurnId = null;
    document.querySelectorAll(".transcript-turn-card.active-turn").forEach((c) => c.classList.remove("active-turn"));

    // 1. Render Transcript & Speakers FIRST so content ALWAYS displays regardless of media availability!
    this.renderTranscript(data);

    // Switch to Workspace view & update navigation tabs
    this.showWorkspaceView();
    if (this.navWorkspaceDot) this.navWorkspaceDot.classList.remove("hidden");
    if (this.btnHomeWorkspace) this.btnHomeWorkspace.classList.remove("hidden");
    if (this.activeFileIndicator) this.activeFileIndicator.classList.remove("hidden");

    if (this.actBarWorkspaceDot) this.actBarWorkspaceDot.classList.remove("hidden");
    if (data.file_path) this.highlightActiveTreeFile(data.file_path);

    if (data.duration) {
      if (this.timeDuration) this.timeDuration.textContent = this.formatTime(data.duration);
      if (this.vTimeDuration) this.vTimeDuration.textContent = this.formatTime(data.duration);
    }

    // 2. Video Player & Media stream handling
    if (data.media_available && data.media_url) {
      if (this.mediaExpiredBanner) this.mediaExpiredBanner.classList.add("hidden");
      this.mediaVideo.classList.remove("hidden");
      this.mediaVideo.src = data.media_url;
      this.mediaVideo.load();
      this.mediaVideo.onloadedmetadata = () => {
        if (this.mediaVideo.duration) {
          const dur = this.formatTime(this.mediaVideo.duration);
          if (this.timeDuration) this.timeDuration.textContent = dur;
          if (this.vTimeDuration) this.vTimeDuration.textContent = dur;
        }
      };
    } else if (data.audio_available && data.audio_url) {
      // Fallback to audio stream if original video is missing
      if (this.mediaExpiredBanner) {
        this.mediaExpiredBanner.classList.remove("hidden");
        const t = document.getElementById("expiredBannerTitle");
        const d = document.getElementById("expiredBannerDesc");
        if (t) t.textContent = "Audio Stream Active";
        if (d) d.textContent = "Original video file is not on disk. Audio waveform is ready. Click below to attach your local video file if desired.";
      }
      this.mediaVideo.classList.remove("hidden");
      this.mediaVideo.src = data.audio_url;
      this.mediaVideo.load();
    } else {
      if (this.mediaExpiredBanner) {
        this.mediaExpiredBanner.classList.remove("hidden");
        const t = document.getElementById("expiredBannerTitle");
        const d = document.getElementById("expiredBannerDesc");
        if (t) t.textContent = "Media Files Unavailable";
        if (d) d.textContent = "Raw media was not found on disk. Click below to attach your local video file to restore full player playback.";
      }
      this.mediaVideo.classList.add("hidden");
      this.mediaVideo.removeAttribute("src");
    }

    // 3. WaveSurfer Audio Waveform handling
    if (data.audio_available && data.audio_url) {
      try {
        this.initWaveSurfer(data.audio_url, data.peaks);
      } catch (wsErr) {
        console.warn("WaveSurfer init error:", wsErr);
      }
    } else {
      if (this.waveformContainer) {
        this.waveformContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:0.85rem">Audio waveform unavailable</div>';
      }
    }
  }

  openMediaTabUntranscribed(item) {
    if (!item || !item.is_media) return;
    const tabId = `untranscribed-${encodeURIComponent(item.path)}`;
    let existing = this.openTabs.find((t) => t.id === tabId);
    if (!existing) {
      existing = {
        id: tabId,
        filename: item.name,
        modelSize: "Preview",
        filePath: item.path,
        isUntranscribed: true,
        item: item
      };
      this.openTabs.push(existing);
    }
    this.activeTabId = tabId;
    this.renderWorkspaceTabs();
    this.updateOpenEditors();
    this.applyUntranscribedMedia(item);
  }

  applyUntranscribedMedia(item) {
    this.currentTranscript = null;
    this.currentAudioPeaks = [];
    this.activeTurnId = null;
    this.currentActiveCaptionTurnId = null;

    // Switch view to workspace
    this.showWorkspaceView();
    if (this.navWorkspaceDot) this.navWorkspaceDot.classList.remove("hidden");
    if (this.btnHomeWorkspace) this.btnHomeWorkspace.classList.remove("hidden");
    if (this.activeFileIndicator) this.activeFileIndicator.classList.remove("hidden");
    if (this.activeFileName) this.activeFileName.textContent = item.name;
    if (this.activeModelBadge) this.activeModelBadge.textContent = "RAW MEDIA";

    if (this.workspaceEmptyTabsState) this.workspaceEmptyTabsState.classList.add("hidden");
    if (this.workspacePlayerContainer) this.workspacePlayerContainer.classList.remove("hidden");

    // Toggle panels: show untranscribed, hide standard transcript panels
    if (this.untranscribedOptionsPanel) this.untranscribedOptionsPanel.classList.remove("hidden");
    const rightToolbar = document.getElementById("workspaceRightToolbar");
    if (rightToolbar) rightToolbar.classList.add("hidden");
    const spkPanel = document.querySelector(".speakers-panel");
    if (spkPanel) spkPanel.classList.add("hidden");
    const trPanel = document.querySelector(".transcript-panel");
    if (trPanel) trPanel.classList.add("hidden");

    // Clear and reset speakers panel & avatar grid
    if (this.speakersAvatarGrid) this.speakersAvatarGrid.innerHTML = "";
    if (this.speakersList) this.speakersList.innerHTML = "";
    if (this.speakerCountBadge) this.speakerCountBadge.textContent = "0";
    if (this.transcriptContainer) this.transcriptContainer.innerHTML = "";

    // Clear and reset subtitles
    if (this.captionAvatarWrap) this.captionAvatarWrap.innerHTML = "";
    if (this.captionSpeakerTag) {
      this.captionSpeakerTag.textContent = "";
      this.captionSpeakerTag.style.color = "";
    }
    if (this.captionText) {
      this.captionText.innerHTML = "";
    }
    if (this.playerCcAvatarWrap) this.playerCcAvatarWrap.innerHTML = "";
    if (this.playerCcSpeakerTag) {
      this.playerCcSpeakerTag.textContent = "";
      this.playerCcSpeakerTag.style.color = "";
    }
    if (this.playerCcText) this.playerCcText.innerHTML = "";
    if (this.playerMinimalCaption) this.playerMinimalCaption.classList.add("hidden");
    if (this.minimalCaptionAvatar) this.minimalCaptionAvatar.innerHTML = "";
    if (this.minimalCaptionSpeaker) this.minimalCaptionSpeaker.textContent = "";

    // Populate untranscribed panel specs
    const titleEl = document.getElementById("untranscribedMediaTitle");
    if (titleEl) titleEl.textContent = item.name;
    const durEl = document.getElementById("untranscribedDuration");
    if (durEl) durEl.textContent = item.duration ? this.formatTime(item.duration) : "--:--";
    const sizeEl = document.getElementById("untranscribedSize");
    if (sizeEl) sizeEl.textContent = this.formatFileSize(item.size || 0);
    const fmtEl = document.getElementById("untranscribedFormat");
    if (fmtEl) fmtEl.textContent = (item.ext || "file").replace(".", "").toUpperCase();

    // Reset progress box
    const progBox = document.getElementById("wsTranscribeProgressBox");
    if (progBox) progBox.classList.add("hidden");
    const progBar = document.getElementById("wsTranscribeProgressBar");
    if (progBar) progBar.style.width = "0%";
    const progPct = document.getElementById("wsTranscribeProgressPct");
    if (progPct) progPct.textContent = "0%";
    const progStatus = document.getElementById("wsTranscribeProgressStatus");
    if (progStatus) progStatus.textContent = "Ready to transcribe";
    const btnStart = document.getElementById("btnStartWsTranscribe");
    if (btnStart) {
      btnStart.disabled = false;
      btnStart.onclick = () => this.startWorkspaceTranscribe(item);
    }

    // Media Video streaming
    if (this.mediaExpiredBanner) this.mediaExpiredBanner.classList.add("hidden");
    if (this.mediaVideo) {
      this.mediaVideo.classList.remove("hidden");
      this.mediaVideo.src = `/api/fs/stream-media?file_path=${encodeURIComponent(item.path)}`;
      this.mediaVideo.load();
      this.mediaVideo.onloadedmetadata = () => {
        if (this.mediaVideo.duration) {
          const dur = this.formatTime(this.mediaVideo.duration);
          if (this.timeDuration) this.timeDuration.textContent = dur;
          if (this.vTimeDuration) this.vTimeDuration.textContent = dur;
          if (durEl) durEl.textContent = dur;
        }
      };
    }

    // Clear colored progress bar & render neutral seeker timeline for untranscribed preview
    if (this.waveformSegmentedTrack) {
      this.waveformSegmentedTrack.innerHTML = "";
      const NUM_BARS = 160;
      for (let i = 0; i < NUM_BARS; i++) {
        const bar = document.createElement("div");
        bar.className = "waveform-bar bar-unmarked";
        bar.dataset.index = i;
        bar.style.setProperty("--bar-h", "16%");
        bar.style.backgroundColor = "rgba(255, 255, 255, 0.12)";
        bar.title = "Preview Seeker";
        bar.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this.mediaVideo && this.mediaVideo.duration) {
            this.mediaVideo.currentTime = (i / NUM_BARS) * this.mediaVideo.duration;
            this.mediaVideo.play();
          }
        });
        this.waveformSegmentedTrack.appendChild(bar);
      }
    }
    if (this.waveformSeekerLine) {
      this.waveformSeekerLine.style.left = "0%";
    }

    // Waveform placeholder for raw preview
    if (this.waveformContainer) {
      this.waveformContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:0.85rem">Audio waveform will generate automatically once transcribed</div>';
    }

    this.highlightActiveTreeFile(item.path);
  }

  async startWorkspaceTranscribe(item) {
    if (!item || !item.path) return;
    const modelSize = document.querySelector('input[name="wsPanelModel"]:checked')?.value || "tiny";
    const langMode = document.querySelector('input[name="wsPanelLang"]:checked')?.value || "en";

    const progBox = document.getElementById("wsTranscribeProgressBox");
    const progBar = document.getElementById("wsTranscribeProgressBar");
    const progStatus = document.getElementById("wsTranscribeProgressStatus");
    const progPct = document.getElementById("wsTranscribeProgressPct");
    const btnStart = document.getElementById("btnStartWsTranscribe");

    if (btnStart) btnStart.disabled = true;
    if (progBox) progBox.classList.remove("hidden");
    if (progBar) progBar.style.width = "5%";
    if (progPct) progPct.textContent = "5%";
    if (progStatus) progStatus.textContent = "Starting transcription job...";

    try {
      const resp = await fetch("/api/process-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: item.path,
          model_size: modelSize,
          language_mode: langMode
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Transcription request failed");
      }

      const res = await resp.json();
      if (res.cached && res.transcript_id) {
        this.showToast(res.message, "success");
        this.closeWorkspaceTab(`untranscribed-${encodeURIComponent(item.path)}`);
        this.loadTranscript(res.transcript_id);
      } else if (res.job_id) {
        this.subscribeWorkspaceTranscribeProgress(res.job_id, item);
      }
    } catch (e) {
      if (btnStart) btnStart.disabled = false;
      if (progStatus) progStatus.textContent = `Failed: ${e.message}`;
      this.showToast(e.message || "Failed to transcribe", "error");
    }
  }

  subscribeWorkspaceTranscribeProgress(jobId, item) {
    const progBar = document.getElementById("wsTranscribeProgressBar");
    const progStatus = document.getElementById("wsTranscribeProgressStatus");
    const progPct = document.getElementById("wsTranscribeProgressPct");
    const btnStart = document.getElementById("btnStartWsTranscribe");

    let pollTimer = null;
    let ws = null;

    const stopTracking = () => {
      if (pollTimer) clearInterval(pollTimer);
      if (ws) {
        try { ws.close(); } catch(e) {}
        ws = null;
      }
    };

    const handleUpdate = async (data) => {
      if (!data) return;
      const pct = data.progress !== undefined ? data.progress : 5;
      if (progBar) progBar.style.width = `${pct}%`;
      if (progPct) progPct.textContent = `${Math.round(pct)}%`;
      if (progStatus) progStatus.textContent = data.message || "Transcribing...";

      if (data.status === "completed") {
        stopTracking();
        setTimeout(async () => {
          try {
            const jobResp = await fetch(`/api/jobs/${jobId}`);
            const jobData = await jobResp.json();
            if (jobData.transcript_id) {
              this.closeWorkspaceTab(`untranscribed-${encodeURIComponent(item.path)}`);
              this.loadTranscript(jobData.transcript_id);
            }
          } catch (err) {
            console.error("Error loading completed job:", err);
          }
        }, 400);
      } else if (data.status === "failed") {
        stopTracking();
        if (btnStart) btnStart.disabled = false;
        if (progStatus) progStatus.textContent = `Error: ${data.message || "Failed"}`;
        this.showToast(`Error: ${data.message || "Pipeline failed"}`, "error");
      }
    };

    // Polling
    pollTimer = setInterval(async () => {
      try {
        const resp = await fetch(`/api/jobs/${jobId}`);
        if (resp.ok) {
          const d = await resp.json();
          await handleUpdate(d);
        }
      } catch (e) {}
    }, 1000);

    // WebSocket
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/${jobId}`);
      ws.onmessage = (event) => {
        try {
          const d = JSON.parse(event.data);
          handleUpdate(d);
        } catch (e) {}
      };
    } catch (e) {}
  }

  // --- Subtitle & Data Exports (F10) ---
  triggerExport(fmt) {
    if (!this.currentTranscript) {
      this.showToast("No active transcript to export", "error");
      return;
    }
    let url = `/api/transcripts/${this.currentTranscript.id}/export/${fmt}`;
    if (fmt === "ai_summary" || fmt === "summary") {
      const customPrompt = localStorage.getItem("whosaid_ai_summary_prompt") || DEFAULT_AI_PROMPT;
      url += `?ai_prompt=${encodeURIComponent(customPrompt)}`;
    }
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    const label = fmt === "ai_summary" ? "AI Summary (.txt)" : `.${fmt.toUpperCase()}`;
    this.showToast(`Exported ${label}`, "success");
  }

  initSettingsAiPrompt() {
    const saved = localStorage.getItem("whosaid_ai_summary_prompt") || DEFAULT_AI_PROMPT;
    if (this.settingAiPromptInput) {
      this.settingAiPromptInput.value = saved;
    }

    if (this.btnSaveAiPrompt) {
      this.btnSaveAiPrompt.addEventListener("click", () => {
        const val = this.settingAiPromptInput ? this.settingAiPromptInput.value.trim() : "";
        localStorage.setItem("whosaid_ai_summary_prompt", val || DEFAULT_AI_PROMPT);
        if (this.aiPromptSavedNotice) {
          this.aiPromptSavedNotice.classList.remove("hidden");
          setTimeout(() => {
            if (this.aiPromptSavedNotice) this.aiPromptSavedNotice.classList.add("hidden");
          }, 2500);
        }
        this.showToast("AI Summary prompt template saved", "success");
      });
    }

    if (this.btnResetAiPrompt) {
      this.btnResetAiPrompt.addEventListener("click", () => {
        if (this.settingAiPromptInput) {
          this.settingAiPromptInput.value = DEFAULT_AI_PROMPT;
        }
        localStorage.setItem("whosaid_ai_summary_prompt", DEFAULT_AI_PROMPT);
        if (this.aiPromptSavedNotice) {
          this.aiPromptSavedNotice.classList.remove("hidden");
          setTimeout(() => {
            if (this.aiPromptSavedNotice) this.aiPromptSavedNotice.classList.add("hidden");
          }, 2500);
        }
        this.showToast("AI Summary prompt reset to default", "info");
      });
    }
  }

  // --- Search Filtering ---
  filterTranscript(query) {
    const q = query.toLowerCase().trim();
    const cards = document.querySelectorAll(".transcript-turn-card");
    let matchCount = 0;

    cards.forEach((card) => {
      const text = card.querySelector(".turn-content").innerText.toLowerCase();
      const speaker = card.querySelector(".turn-speaker-badge").innerText.toLowerCase();
      if (!q || text.includes(q) || speaker.includes(q)) {
        card.classList.remove("hidden");
        matchCount++;
      } else {
        card.classList.add("hidden");
      }
    });

    this.searchNoResults.classList.toggle("hidden", matchCount > 0);
  }

  // --- UI Toast Notifications ---
  showToast(message, type = "info") {
    if (window.WhoSaidUtils && typeof window.WhoSaidUtils.showToast === "function") {
      return window.WhoSaidUtils.showToast(message, type);
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    const c = document.getElementById("toastContainer");
    if (c) c.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(20px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  escapeHtml(str) {
    if (window.WhoSaidUtils && typeof window.WhoSaidUtils.escapeHtml === "function") {
      return window.WhoSaidUtils.escapeHtml(str);
    }
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  formatFileSize(bytes) {
    if (window.WhoSaidUtils && typeof window.WhoSaidUtils.formatFileSize === "function") {
      return window.WhoSaidUtils.formatFileSize(bytes);
    }
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // --- VS Code Workbench & Folder Explorer Logic ---
  initVsCodeExplorer() {
    // Restore sidebar state & width from localStorage
    const savedWidth = localStorage.getItem("whosaid_explorer_width");
    if (savedWidth && this.vscodeExplorerSidebar) {
      this.vscodeExplorerSidebar.style.width = `${Math.min(550, Math.max(200, parseInt(savedWidth)))}px`;
    }

    const isCollapsed = localStorage.getItem("whosaid_explorer_collapsed") === "true";
    if (isCollapsed && this.vscodeExplorerSidebar) {
      this.vscodeExplorerSidebar.classList.add("collapsed");
      if (this.actBarExplorer) this.actBarExplorer.classList.remove("active");
    }

    // Activity Bar interactions
    if (this.actBarExplorer) {
      this.actBarExplorer.addEventListener("click", () => this.toggleExplorerSidebar());
    }
    if (this.actBarHome) {
      this.actBarHome.addEventListener("click", () => {
        this.showHomeView();
        this.updateActivityBar("home");
      });
    }
    if (this.actBarWorkspace) {
      this.actBarWorkspace.addEventListener("click", () => {
        if (this.currentTranscript) {
          this.showWorkspaceView();
          this.updateActivityBar("workspace");
        } else {
          this.showToast("No active session. Open a file to start editing.", "info");
        }
      });
    }
    if (this.actBarProfiles) {
      this.actBarProfiles.addEventListener("click", () => this.openProfilesModal());
    }
    if (this.actBarHistory) {
      this.actBarHistory.addEventListener("click", () => this.openHistoryModal());
    }
    if (this.actBarToggleSidebar) {
      this.actBarToggleSidebar.addEventListener("click", () => this.toggleExplorerSidebar());
    }
    if (this.btnHeaderToggleSidebar) {
      this.btnHeaderToggleSidebar.addEventListener("click", () => this.toggleExplorerSidebar());
    }

    // Open Folder Triggers
    const openFolderHandlers = [
      this.btnHeaderOpenFolder,
      this.btnHomeOpenFolder,
      this.btnExplorerOpenFolder,
      this.btnEmptyOpenFolder,
      this.btnChangeFolder
    ];
    openFolderHandlers.forEach((btn) => {
      if (btn) btn.addEventListener("click", () => this.selectFolderDialog());
    });

    // Open Folder Modal events
    const btnCloseFolderM = document.getElementById("btnCloseOpenFolderModal");
    if (btnCloseFolderM) btnCloseFolderM.addEventListener("click", () => this.closeFolderModal());
    const btnCancelFolderM = document.getElementById("btnCancelOpenFolder");
    if (btnCancelFolderM) btnCancelFolderM.addEventListener("click", () => this.closeFolderModal());
    const btnBrowseNative = document.getElementById("btnBrowseNativeSystemFolder");
    if (btnBrowseNative) btnBrowseNative.addEventListener("click", () => this.browseNativeFolderFromModal());
    const btnConfirmFolder = document.getElementById("btnConfirmOpenFolder");
    if (btnConfirmFolder) {
      btnConfirmFolder.addEventListener("click", () => {
        const input = document.getElementById("openFolderManualInput");
        const path = input ? input.value.trim() : "";
        if (!path) {
          this.showToast("Please enter or select a folder path", "warning");
          return;
        }
        this.loadFolderTree(path);
        this.closeFolderModal();
      });
    }
    const openFolderManualInput = document.getElementById("openFolderManualInput");
    if (openFolderManualInput) {
      openFolderManualInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const path = openFolderManualInput.value.trim();
          if (path) {
            this.loadFolderTree(path);
            this.closeFolderModal();
          }
        }
      });
    }

    if (this.btnEmptyOpenSample) {
      this.btnEmptyOpenSample.addEventListener("click", () => this.openSampleFolder());
    }

    if (this.btnExplorerRefresh) {
      this.btnExplorerRefresh.addEventListener("click", () => this.refreshFolderTree());
    }

    if (this.btnExplorerCollapseAll) {
      this.btnExplorerCollapseAll.addEventListener("click", () => this.collapseAllTreeFolders());
    }

    if (this.btnExplorerFilterMedia) {
      this.btnExplorerFilterMedia.addEventListener("click", () => {
        this.mediaOnlyFilter = !this.mediaOnlyFilter;
        this.btnExplorerFilterMedia.classList.toggle("active", this.mediaOnlyFilter);
        this.applyTreeFilter();
      });
    }

    if (this.explorerSearchInput) {
      this.explorerSearchInput.addEventListener("input", () => {
        const val = this.explorerSearchInput.value.trim();
        if (this.btnClearExplorerFilter) {
          this.btnClearExplorerFilter.classList.toggle("hidden", !val);
        }
        this.applyTreeFilter();
      });
    }

    if (this.btnClearExplorerFilter) {
      this.btnClearExplorerFilter.addEventListener("click", () => {
        if (this.explorerSearchInput) {
          this.explorerSearchInput.value = "";
          this.btnClearExplorerFilter.classList.add("hidden");
          this.applyTreeFilter();
        }
      });
    }

    // Accordions
    if (this.headerOpenEditors) {
      this.headerOpenEditors.addEventListener("click", () => {
        this.headerOpenEditors.classList.toggle("collapsed");
      });
    }
    if (this.headerFolderTree) {
      this.headerFolderTree.addEventListener("click", (e) => {
        if (e.target.closest("#btnChangeFolder")) return;
        this.headerFolderTree.classList.toggle("collapsed");
      });
    }

    if (this.openEditorsItem) {
      this.openEditorsItem.addEventListener("click", () => {
        if (this.currentTranscript) this.showWorkspaceView();
      });
    }

    // Properties Accordion & Actions
    if (this.headerProperties) {
      this.headerProperties.addEventListener("click", (e) => {
        if (e.target.closest("#btnClearProperties")) return;
        this.headerProperties.classList.toggle("collapsed");
      });
    }
    if (this.btnClearProperties) {
      this.btnClearProperties.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearFileProperties();
      });
    }
    if (this.btnPropAction) {
      this.btnPropAction.addEventListener("click", () => {
        if (!this.selectedPropertyItem) return;
        const item = this.selectedPropertyItem;
        if (item.cached_job && item.cached_job.transcript_id) {
          this.loadTranscript(item.cached_job.transcript_id);
          this.highlightActiveTreeFile(item.path);
        } else if (item.is_media) {
          this.openMediaTabUntranscribed(item);
        }
      });
    }

    // Explorer Properties Custom Tags
    if (this.btnPropAddTag) {
      this.btnPropAddTag.addEventListener("click", () => {
        if (!this.selectedPropertyItem || !this.propNewTagInput) return;
        const val = this.propNewTagInput.value.trim();
        if (val) {
          this.addTagToFile(this.selectedPropertyItem, val);
          this.propNewTagInput.value = "";
        }
      });
    }
    if (this.propNewTagInput) {
      this.propNewTagInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!this.selectedPropertyItem) return;
          const val = this.propNewTagInput.value.trim();
          if (val) {
            this.addTagToFile(this.selectedPropertyItem, val);
            this.propNewTagInput.value = "";
          }
        }
      });
    }

    // Sidebar Resizer Handle
    this.initSidebarResizer();

    // Transcribe Path Modal actions
    if (this.btnCloseTranscribePathModal) {
      this.btnCloseTranscribePathModal.addEventListener("click", () => this.closeTranscribePathModal());
    }
    if (this.btnCancelTranscribePath) {
      this.btnCancelTranscribePath.addEventListener("click", () => this.closeTranscribePathModal());
    }
    if (this.btnStartTranscribePath) {
      this.btnStartTranscribePath.addEventListener("click", () => this.startProcessingPath());
    }

    // Keyboard Shortcuts: Ctrl+B (Toggle Explorer) & Ctrl+O (Open Folder)
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        this.toggleExplorerSidebar();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        this.selectFolderDialog();
      }
    });

    // Electron IPC Event Listeners
    if (window.electronAPI) {
      window.addEventListener("message", (event) => {
        if (event.data?.type === "menu:open-folder") {
          this.selectFolderDialog();
        } else if (event.data?.type === "menu:toggle-explorer") {
          this.toggleExplorerSidebar();
        } else if (event.data?.type === "menu:select-folder-path") {
          this.loadFolderTree(event.data.path);
        }
      });
    }

    // Restore last opened folder or show empty state with recent folders
    this.initInitialFolder();
  }

  async initInitialFolder() {
    await this.renderRecentFolders();
    const lastFolder = localStorage.getItem("whosaid_last_folder");
    if (lastFolder) {
      this.loadFolderTree(lastFolder, true);
    }
  }

  async renderRecentFolders() {
    if (!this.recentFoldersWrap || !this.recentFoldersList) return;
    let list = [];
    if (window.electronAPI?.getRecentFolders) {
      try {
        list = await window.electronAPI.getRecentFolders();
      } catch (e) {
        list = [];
      }
    }
    if (!list || list.length === 0) {
      try {
        const stored = localStorage.getItem("whosaid_recent_folders");
        if (stored) list = JSON.parse(stored);
      } catch (e) {}
    }

    if (list && list.length > 0) {
      this.recentFoldersWrap.classList.remove("hidden");
      this.recentFoldersList.innerHTML = list.map((folderPath) => {
        const folderName = folderPath.split(/[\\/]/).pop() || folderPath;
        return `
          <button class="recent-folder-btn" data-path="${encodeURIComponent(folderPath)}" title="${folderPath}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:#e5b567;flex-shrink:0;">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${folderName}</span>
          </button>
        `;
      }).join("");

      this.recentFoldersList.querySelectorAll(".recent-folder-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const p = decodeURIComponent(btn.dataset.path);
          this.loadFolderTree(p);
        });
      });
    } else {
      this.recentFoldersWrap.classList.add("hidden");
    }
  }

  toggleExplorerSidebar() {
    if (!this.vscodeExplorerSidebar) return;
    const isNowCollapsed = this.vscodeExplorerSidebar.classList.toggle("collapsed");
    localStorage.setItem("whosaid_explorer_collapsed", isNowCollapsed ? "true" : "false");
    if (this.actBarExplorer) {
      this.actBarExplorer.classList.toggle("active", !isNowCollapsed);
    }
  }

  updateActivityBar(activeTab) {
    if (this.actBarHome) this.actBarHome.classList.toggle("active", activeTab === "home");
    if (this.actBarWorkspace) this.actBarWorkspace.classList.toggle("active", activeTab === "workspace");
    if (this.actBarProfiles) this.actBarProfiles.classList.toggle("active", activeTab === "profiles");
    if (this.actBarHistory) this.actBarHistory.classList.toggle("active", activeTab === "history");
  }

  initSidebarResizer() {
    if (!this.vscodeResizer || !this.vscodeExplorerSidebar) return;
    let isDragging = false;

    const onMouseDown = () => {
      isDragging = true;
      this.vscodeResizer.classList.add("resizing");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const newWidth = e.clientX - 48; // Activity bar is 48px
      if (newWidth >= 180 && newWidth <= 550) {
        this.vscodeExplorerSidebar.style.width = `${newWidth}px`;
        localStorage.setItem("whosaid_explorer_width", newWidth);
      }
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        this.vscodeResizer.classList.remove("resizing");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    this.vscodeResizer.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  async selectFolderDialog() {
    // 1. In Electron, invoke native dialog
    if (window.electronAPI?.openFolderDialog) {
      try {
        const chosen = await window.electronAPI.openFolderDialog();
        if (chosen) {
          this.loadFolderTree(chosen);
          return;
        }
      } catch (err) {
        console.error("Electron folder dialog error:", err);
      }
    }

    // 2. In Browser, open the in-app folder picker modal with quick shortcuts + native browse
    this.openFolderModal();
  }

  async openFolderModal() {
    const modal = document.getElementById("openFolderModal");
    if (!modal) return;

    const input = document.getElementById("openFolderManualInput");
    if (input) {
      input.value = this.currentFolderPath || "";
    }

    // Load and render quick locations
    this.renderQuickDirectories();

    // Render recent folders in modal
    this.renderModalRecentFolders();

    modal.classList.remove("hidden");
    if (input) {
      setTimeout(() => input.focus(), 100);
    }
  }

  closeFolderModal() {
    const modal = document.getElementById("openFolderModal");
    if (modal) modal.classList.add("hidden");
  }

  async renderQuickDirectories() {
    const container = document.getElementById("quickDirsContainer");
    if (!container) return;
    try {
      const resp = await fetch("/api/fs/quick-directories");
      if (!resp.ok) return;
      const data = await resp.json();
      container.innerHTML = "";

      const iconMap = {
        video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-brand-400"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`,
        download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-emerald-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
        music: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-purple-400"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
        folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-amber-400"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
        code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4 text-cyan-400"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`
      };

      (data.directories || []).forEach((dir) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "flex items-center gap-2 p-2.5 rounded-lg border border-surface-border bg-surface-card hover:bg-surface-hover hover:border-brand-500/50 transition-all text-left group";
        btn.innerHTML = `
          <div class="shrink-0">${iconMap[dir.icon] || iconMap.folder}</div>
          <div class="min-w-0">
            <div class="text-xs font-semibold truncate text-text-main group-hover:text-brand-400">${this.escapeHtml(dir.name)}</div>
            <div class="text-[10px] text-text-dim truncate" title="${this.escapeHtml(dir.path)}">${this.escapeHtml(dir.path)}</div>
          </div>
        `;
        btn.addEventListener("click", () => {
          this.loadFolderTree(dir.path);
          this.closeFolderModal();
        });
        container.appendChild(btn);
      });
    } catch (e) {
      console.warn("Failed to load quick directories:", e);
    }
  }

  renderModalRecentFolders() {
    const section = document.getElementById("modalRecentFoldersSection");
    const container = document.getElementById("modalRecentFoldersList");
    if (!section || !container) return;

    try {
      const stored = localStorage.getItem("whosaid_recent_folders");
      const list = stored ? JSON.parse(stored) : [];
      if (!list || list.length === 0) {
        section.classList.add("hidden");
        return;
      }
      section.classList.remove("hidden");
      container.innerHTML = "";
      list.slice(0, 5).forEach((p) => {
        const item = document.createElement("div");
        item.className = "flex items-center justify-between p-1.5 rounded hover:bg-surface-hover cursor-pointer group text-xs";
        item.innerHTML = `
          <span class="font-mono text-text-muted group-hover:text-text-main truncate mr-2">${this.escapeHtml(p)}</span>
          <span class="text-[10px] text-brand-400 font-semibold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
        `;
        item.addEventListener("click", () => {
          this.loadFolderTree(p);
          this.closeFolderModal();
        });
        container.appendChild(item);
      });
    } catch (e) {
      section.classList.add("hidden");
    }
  }

  async browseNativeFolderFromModal() {
    const btn = document.getElementById("btnBrowseNativeSystemFolder");
    if (btn) btn.disabled = true;
    try {
      const input = document.getElementById("openFolderManualInput");
      const current = input ? input.value.trim() : "";
      const resp = await fetch("/api/fs/choose-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initial_dir: current || this.currentFolderPath || null })
      });
      const data = await resp.json();
      if (data.status === "success" && data.folder_path) {
        if (input) input.value = data.folder_path;
        this.loadFolderTree(data.folder_path);
        this.closeFolderModal();
      }
    } catch (e) {
      console.error("Browse native folder error:", e);
      this.showToast("Could not open system dialog", "error");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  openSampleFolder() {
    this.openFolderPicker();
  }

  async refreshFolderTree() {
    if (this.currentFolderPath) {
      this.loadFolderTree(this.currentFolderPath);
      this.showToast("Folder tree refreshed", "info");
    }
  }

  collapseAllTreeFolders() {
    if (!this.explorerTreeView) return;
    this.explorerTreeView.querySelectorAll(".tree-chevron.expanded").forEach((ch) => {
      ch.classList.remove("expanded");
    });
    this.explorerTreeView.querySelectorAll(".tree-children").forEach((ch) => {
      ch.classList.add("hidden");
    });
  }

  async loadFolderTree(folderPath, silent = false) {
    if (!folderPath) return;
    try {
      const resp = await fetch(`/api/fs/scan-folder?folder_path=${encodeURIComponent(folderPath)}`);
      if (!resp.ok) {
        if (!silent) this.showToast(`Could not open folder: ${folderPath}`, "error");
        return;
      }
      const data = await resp.json();
      this.currentFolderPath = data.folder_path;
      this.currentFolderTree = data.root;

      // Persist in localStorage and Electron settings
      localStorage.setItem("whosaid_last_folder", data.folder_path);
      this.saveToRecentFolders(data.folder_path);
      if (window.electronAPI?.saveRecentFolder) {
        window.electronAPI.saveRecentFolder(data.folder_path);
      }

      // Ensure explorer sidebar is opened (only on explicit user action, not silent auto-refresh)
      if (!silent && this.vscodeExplorerSidebar && this.vscodeExplorerSidebar.classList.contains("collapsed")) {
        this.toggleExplorerSidebar();
      }

      // Update Root Section Title
      if (this.explorerRootFolderName) {
        this.explorerRootFolderName.textContent = data.folder_name.toUpperCase();
        this.explorerRootFolderName.title = data.folder_path;
      }

      // Render Tree
      if (this.explorerEmptyState) this.explorerEmptyState.classList.add("hidden");
      if (this.explorerTreeView) {
        this.explorerTreeView.classList.remove("hidden");
        this.refreshExplorerTree(silent);
      }

      // Activate auto-refresh timer
      this.startExplorerAutoRefresh();

      if (!silent) {
        this.showToast(`Opened folder: ${data.folder_name}`, "success");
      }
    } catch (err) {
      console.error("Error loading folder tree:", err);
      if (!silent) this.showToast("Failed to scan folder", "error");
    }
  }

  startExplorerAutoRefresh() {
    if (this._explorerAutoRefreshTimer) return;
    this._explorerAutoRefreshTimer = setInterval(() => {
      if (this.currentFolderPath && !document.hidden) {
        this.loadFolderTree(this.currentFolderPath, true);
      }
    }, 4000);

    if (!this._windowFocusBound) {
      this._windowFocusBound = true;
      window.addEventListener("focus", () => {
        if (this.currentFolderPath) {
          this.loadFolderTree(this.currentFolderPath, true);
        }
      });
    }
  }

  refreshExplorerTree(preserveExpanded = false) {
    if (!this.currentFolderTree || !this.explorerTreeView) return;
    const groupBy = this.explorerGroupBySelect ? this.explorerGroupBySelect.value : "none";

    // Preserve expanded folder paths on silent refresh
    const expandedPaths = new Set();
    if (preserveExpanded) {
      this.explorerTreeView.querySelectorAll(".folder-node").forEach((node) => {
        const chevron = node.querySelector(".tree-chevron.expanded");
        if (chevron && node.dataset.path) expandedPaths.add(node.dataset.path);
      });
    }

    this.explorerTreeView.innerHTML = "";
    if (groupBy === "none" || !groupBy) {
      this.renderTreeNode(this.currentFolderTree, this.explorerTreeView, 0);
    } else {
      this.renderGroupedExplorer(this.currentFolderTree, groupBy);
    }

    if (preserveExpanded && expandedPaths.size > 0) {
      this.explorerTreeView.querySelectorAll(".folder-node").forEach((node) => {
        if (expandedPaths.has(node.dataset.path)) {
          const chevron = node.querySelector(".tree-chevron");
          const container = node.parentElement?.querySelector(".tree-children");
          if (chevron && container) {
            chevron.classList.add("expanded");
            container.classList.remove("hidden");
          }
        }
      });
    }

    this.applyTreeFilter();
  }

  getAllFilesFromTree(node) {
    if (!node) return [];
    const files = [];
    const traverse = (item) => {
      if (!item) return;
      if (item.is_dir) {
        if (item.children && Array.isArray(item.children)) {
          item.children.forEach(traverse);
        }
      } else {
        files.push(item);
      }
    };
    traverse(node);
    return files;
  }

  renderGroupedExplorer(rootNode, groupBy) {
    const allFiles = this.getAllFilesFromTree(rootNode);
    if (allFiles.length === 0) {
      this.explorerTreeView.innerHTML = `<div class="tree-empty-hint">No files found</div>`;
      return;
    }

    const groups = {};
    const now = Date.now();

    allFiles.forEach((f) => {
      let gName = "Other";
      if (groupBy === "tag") {
        const fileTags = (f.tags && f.tags.length > 0) ? f.tags : ["Untagged"];
        fileTags.forEach((tg) => {
          if (!groups[tg]) groups[tg] = [];
          groups[tg].push(f);
        });
        return;
      }
      if (groupBy === "date") {
        const timestamp = (f.mtime && Number(f.mtime) > 0) ? Number(f.mtime) * 1000 : 0;
        let sortKey = 0;

        if (timestamp > 0) {
          const fileDate = new Date(timestamp);
          const year = fileDate.getFullYear();
          const month = fileDate.toLocaleString("en-US", { month: "short" });
          const day = fileDate.getDate();

          // Format requested: "2024 > May > 14"
          gName = `${year} > ${month} > ${day}`;
          sortKey = new Date(year, fileDate.getMonth(), day).getTime();
        } else {
          gName = "No Date";
          sortKey = -1;
        }
        f._groupSortKey = sortKey;
      } else if (groupBy === "size") {
        const sz = f.size || 0;
        if (sz >= 100 * 1024 * 1024) {
          gName = "Very Large (> 100 MB)";
        } else if (sz >= 20 * 1024 * 1024) {
          gName = "Large (20 MB - 100 MB)";
        } else if (sz >= 5 * 1024 * 1024) {
          gName = "Medium (5 MB - 20 MB)";
        } else {
          gName = "Small (< 5 MB)";
        }
      } else if (groupBy === "duration") {
        const d = f.duration || (f.cached_job ? f.cached_job.duration : 0) || 0;
        if (d >= 900) {
          gName = "Long (> 15 min)";
        } else if (d >= 120) {
          gName = "Medium (2 min - 15 min)";
        } else if (d > 0) {
          gName = "Short (< 2 min)";
        } else {
          gName = "No Duration / Other";
        }
      }

      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(f);
    });

    let order = Object.keys(groups);
    if (groupBy === "tag") {
      order.sort((a, b) => {
        if (a === "Untagged") return 1;
        if (b === "Untagged") return -1;
        return a.localeCompare(b);
      });
    } else if (groupBy === "date") {
      order.sort((a, b) => {
        const keyA = groups[a][0]?._groupSortKey ?? 0;
        const keyB = groups[b][0]?._groupSortKey ?? 0;
        return keyB - keyA; // Newest date first
      });
    } else if (groupBy === "size") {
      const sizeOrder = ["Very Large (> 100 MB)", "Large (20 MB - 100 MB)", "Medium (5 MB - 20 MB)", "Small (< 5 MB)"];
      order.sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b));
    } else if (groupBy === "duration") {
      const durOrder = ["Long (> 15 min)", "Medium (2 min - 15 min)", "Short (< 2 min)", "No Duration / Other"];
      order.sort((a, b) => durOrder.indexOf(a) - durOrder.indexOf(b));
    }

    order.forEach((gName) => {
      const items = groups[gName];
      if (!items || items.length === 0) return;

      // Sort files inside each group by modified time descending if grouping by date
      if (groupBy === "date") {
        items.sort((a, b) => ((b.mtime || 0) - (a.mtime || 0)));
      }

      const groupWrap = document.createElement("div");
      groupWrap.className = "tree-node-wrap";

      const headerRow = document.createElement("div");
      headerRow.className = "tree-node folder-node";
      headerRow.style.paddingLeft = "10px";
      headerRow.dataset.isDir = "true";
      headerRow.dataset.path = `group-${gName}`;
      headerRow.innerHTML = `
        <span class="tree-chevron expanded">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </span>
        <span class="tree-icon icon-folder">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
        </span>
        <span class="item-name" style="font-weight:600;">${this.escapeHtml(gName)}</span>
        <span class="tree-badge-media-count">${items.length} ${items.length === 1 ? 'file' : 'files'}</span>
      `;

      const childrenContainer = document.createElement("div");
      childrenContainer.className = "tree-children";

      headerRow.addEventListener("click", () => {
        const chevron = headerRow.querySelector(".tree-chevron");
        const isExpanded = chevron.classList.toggle("expanded");
        childrenContainer.classList.toggle("hidden", !isExpanded);
      });

      items.forEach((item) => {
        const fileEl = this.createFileNodeElement(item, 24);
        childrenContainer.appendChild(fileEl);
      });

      groupWrap.appendChild(headerRow);
      groupWrap.appendChild(childrenContainer);
      this.explorerTreeView.appendChild(groupWrap);
    });
  }


  createFileNodeElement(item, paddingLeft = 14) {
    const el = document.createElement("div");
    el.className = "tree-node-wrap";

    const row = document.createElement("div");
    row.className = "tree-node file-node";
    row.style.paddingLeft = `${paddingLeft}px`;
    row.dataset.path = item.path;
    row.dataset.name = (item.name || "").toLowerCase();
    row.dataset.isMedia = item.is_media ? "true" : "false";
    row.dataset.isDir = "false";
    row.dataset.tags = (item.tags || []).join(" ").toLowerCase();

    let iconSvg = "";
    let iconClass = "icon-file";
    if (item.is_media) {
      const isVideo = [".mp4", ".mkv", ".mov", ".webm"].includes(item.ext);
      if (isVideo) {
        iconClass = "icon-video";
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`;
      } else {
        iconClass = "icon-audio";
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
      }
    } else if (item.is_subtitle) {
      iconClass = "icon-subtitle";
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
    } else {
      iconClass = "icon-file";
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    }

    const cachedBadge = item.cached_job ? `<span class="tree-badge-cached" title="Transcribed with Whisper ${item.cached_job.model_size}">✓ Ready</span>` : "";

    const tagsHtml = (item.tags && item.tags.length > 0)
      ? `<div class="tree-node-tags-wrap">${item.tags.map((t) => `<span class="tree-file-tag" title="Tag: ${this.escapeHtml(t)}">${this.escapeHtml(t)}</span>`).join("")}</div>`
      : "";

    let actionButtons = "";
    if (item.is_media) {
      const btnLabel = item.cached_job ? "Open" : "Transcribe";
      actionButtons = `
        <div class="tree-node-actions">
          <button class="tree-action-pill" title="${btnLabel} file">${btnLabel}</button>
          ${window.electronAPI ? `<button class="tree-action-icon btn-reveal-os" title="Reveal in Windows Explorer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></button>` : ""}
        </div>
      `;
    }

    row.innerHTML = `
      <span class="tree-icon ${iconClass}">${iconSvg}</span>
      <span class="item-name" title="${item.path}">${this.escapeHtml(item.name)}</span>
      ${tagsHtml}
      ${cachedBadge}
      ${actionButtons}
    `;

    // Click actions
    row.addEventListener("click", (e) => {
      if (e.target.closest(".btn-reveal-os")) {
        e.stopPropagation();
        if (window.electronAPI?.showInFolder) {
          window.electronAPI.showInFolder(item.path);
        }
        return;
      }

      // Always display properties in Properties Window
      this.displayFileProperties(item);

      // If clicked specifically on the action pill, execute immediately
      if (e.target.closest(".tree-action-pill")) {
        if (item.is_media) {
          if (item.cached_job && item.cached_job.transcript_id) {
            this.loadTranscript(item.cached_job.transcript_id);
          } else {
            this.openMediaTabUntranscribed(item);
          }
        }
      }
    });

    // Double click to open/transcribe immediately
    row.addEventListener("dblclick", () => {
      if (item.is_media) {
        if (item.cached_job && item.cached_job.transcript_id) {
          this.loadTranscript(item.cached_job.transcript_id);
        } else {
          this.openMediaTabUntranscribed(item);
        }
      }
    });

    el.appendChild(row);
    return el;
  }

  saveToRecentFolders(folderPath) {
    if (!folderPath) return;
    try {
      let list = [];
      const stored = localStorage.getItem("whosaid_recent_folders");
      if (stored) list = JSON.parse(stored);
      list = list.filter((p) => p !== folderPath);
      list.unshift(folderPath);
      localStorage.setItem("whosaid_recent_folders", JSON.stringify(list.slice(0, 10)));
    } catch (e) {}
  }

  renderTreeNode(node, container, depth) {
    if (!node.children || node.children.length === 0) {
      if (depth === 0) {
        container.innerHTML = `<div class="tree-empty-hint">Folder is empty</div>`;
      }
      return;
    }

    node.children.forEach((item) => {
      const paddingLeft = depth * 14 + 10;
      const el = document.createElement("div");
      el.className = "tree-node-wrap";

      if (item.is_dir) {
        // Directory row
        const row = document.createElement("div");
        row.className = "tree-node folder-node";
        row.style.paddingLeft = `${paddingLeft}px`;
        row.dataset.path = item.path;
        row.dataset.name = item.name.toLowerCase();
        row.dataset.isDir = "true";
        row.dataset.hasMedia = item.media_count > 0 ? "true" : "false";

        const hasChildren = item.children && item.children.length > 0;
        const mediaCountBadge = item.media_count > 0 ? `<span class="tree-badge-media-count">${item.media_count} media</span>` : "";

        row.innerHTML = `
          <span class="tree-chevron ${hasChildren ? "expanded" : ""}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </span>
          <span class="tree-icon icon-folder">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
          </span>
          <span class="item-name">${this.escapeHtml(item.name)}</span>
          ${mediaCountBadge}
        `;

        const childrenContainer = document.createElement("div");
        childrenContainer.className = "tree-children";

        row.addEventListener("click", () => {
          const chevron = row.querySelector(".tree-chevron");
          const isExpanded = chevron.classList.toggle("expanded");
          childrenContainer.classList.toggle("hidden", !isExpanded);
        });

        el.appendChild(row);
        el.appendChild(childrenContainer);
        container.appendChild(el);

        // Recurse children
        this.renderTreeNode(item, childrenContainer, depth + 1);
      } else {
        const fileEl = this.createFileNodeElement(item, paddingLeft + 14);
        container.appendChild(fileEl);
      }
    });
  }

  highlightActiveTreeFile(filePath) {
    if (!this.explorerTreeView) return;
    this.explorerTreeView.querySelectorAll(".tree-node.file-node").forEach((node) => {
      node.classList.toggle("active-file", node.dataset.path === filePath);
    });
  }

  displayFileProperties(item) {
    if (!item || !this.propDetailsCard) return;
    this.selectedPropertyItem = item;

    if (this.propEmptyNotice) this.propEmptyNotice.classList.add("hidden");
    if (this.propDetailsCard) this.propDetailsCard.classList.remove("hidden");
    if (this.btnClearProperties) this.btnClearProperties.classList.remove("hidden");

    // File icon
    let icon = "📄";
    if (item.is_media) {
      const ext = (item.ext || "").toLowerCase();
      icon = [".mp3", ".wav"].includes(ext) ? "🎵" : "🎬";
    } else if (item.is_subtitle) {
      icon = "💬";
    }
    if (this.propFileIcon) this.propFileIcon.textContent = icon;
    if (this.propFileName) {
      this.propFileName.textContent = item.name || "File";
      this.propFileName.title = item.name || "";
    }
    if (this.propFileSize) this.propFileSize.textContent = this.formatFileSize(item.size || 0);
    if (this.propFilePath) {
      this.propFilePath.textContent = item.path || "--";
      this.propFilePath.title = item.path || "";
    }
    if (this.propFileFormat) {
      const ext = (item.ext || "").replace(".", "").toUpperCase();
      this.propFileFormat.textContent = ext ? `${ext} File` : "File";
    }

    const isCached = Boolean(item.cached_job && item.cached_job.transcript_id);
    if (this.propFileStatus) {
      this.propFileStatus.textContent = isCached ? "Transcribed (Ready)" : (item.is_media ? "Not Transcribed" : "File");
      this.propFileStatus.className = `prop-value prop-status-tag ${isCached ? "status-cached" : ""}`;
    }

    if (this.propFileDuration) {
      if (item.duration) {
        this.propFileDuration.textContent = this.formatTime(item.duration);
      } else if (item.cached_job?.duration) {
        this.propFileDuration.textContent = this.formatTime(item.cached_job.duration);
      } else {
        this.propFileDuration.textContent = item.is_media ? "Probing..." : "N/A";
      }
    }

    if (this.btnPropActionText) {
      this.btnPropActionText.textContent = isCached ? "Open in Workspace" : (item.is_media ? "Transcribe Media" : "Open");
    }

    this.highlightActiveTreeFile(item.path);
    this.renderPropTags(item);

    // Asynchronously fetch extra properties from backend
    if (item.path) {
      fetch(`/api/fs/file-properties?file_path=${encodeURIComponent(item.path)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((props) => {
          if (props && this.selectedPropertyItem && (this.selectedPropertyItem.path === item.path || this.selectedPropertyItem.name === item.name)) {
            if (props.duration != null && props.duration > 0 && this.propFileDuration) {
              item.duration = props.duration;
              this.propFileDuration.textContent = this.formatTime(props.duration);
            } else if (this.propFileDuration && item.is_media && this.propFileDuration.textContent === "Probing...") {
              this.propFileDuration.textContent = "--:--";
            }
            if (props.cached && props.transcript_id) {
              item.cached_job = {
                transcript_id: props.transcript_id,
                job_id: props.job_id,
                model_size: props.model_size,
                duration: props.duration
              };
              if (this.propFileStatus) {
                this.propFileStatus.textContent = "Transcribed (Ready)";
                this.propFileStatus.className = "prop-value prop-status-tag status-cached";
              }
              if (this.btnPropActionText) {
                this.btnPropActionText.textContent = "Open in Workspace";
              }
            }
          }
        })
        .catch(() => {});
    }
  }

  renderPropTags(item) {
    if (!this.propTagsList) return;
    this.propTagsList.innerHTML = "";

    const tags = item.tags || [];
    if (this.propTagsCount) {
      this.propTagsCount.textContent = tags.length;
    }

    if (tags.length === 0) {
      this.propTagsList.innerHTML = `<span class="prop-tag-empty text-xs text-text-muted italic">No custom tags</span>`;
      return;
    }

    tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "prop-tag-chip";
      chip.innerHTML = `
        <span class="prop-tag-label">${this.escapeHtml(tag)}</span>
        <button class="prop-tag-del-btn" title="Remove tag">&times;</button>
      `;

      chip.querySelector(".prop-tag-del-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.removeTagFromFile(item, tag);
      });

      this.propTagsList.appendChild(chip);
    });
  }

  async addTagToFile(item, tag) {
    if (!item || !item.path || !tag) return;
    const cleanTag = tag.trim().replace(/[^\w\s\-_]/g, "").slice(0, 30);
    if (!cleanTag) return;

    if (!item.tags) item.tags = [];
    if (item.tags.includes(cleanTag)) {
      this.showToast(`Tag "${cleanTag}" already exists`, "info");
      return;
    }

    try {
      const resp = await fetch("/api/fs/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: item.path, tag: cleanTag })
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Failed to add tag");
      }

      item.tags.push(cleanTag);
      this.renderPropTags(item);
      this.updateTreeNodeTags(item);
      this.showToast(`Added tag "${cleanTag}"`, "success");
    } catch (e) {
      this.showToast(e.message || "Could not add tag", "error");
    }
  }

  async removeTagFromFile(item, tag) {
    if (!item || !item.path || !tag) return;

    try {
      const resp = await fetch("/api/fs/tags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: item.path, tag: tag })
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Failed to remove tag");
      }

      if (item.tags) {
        item.tags = item.tags.filter((t) => t !== tag);
      }
      this.renderPropTags(item);
      this.updateTreeNodeTags(item);
      this.showToast(`Removed tag "${tag}"`, "info");
    } catch (e) {
      this.showToast(e.message || "Could not remove tag", "error");
    }
  }

  updateTreeNodeTags(item) {
    if (!this.explorerTreeView || !item || !item.path) return;
    const nodes = this.explorerTreeView.querySelectorAll(`.tree-node.file-node`);
    nodes.forEach((row) => {
      if (row.dataset.path === item.path) {
        row.dataset.tags = (item.tags || []).join(" ").toLowerCase();
        let tagsWrap = row.querySelector(".tree-node-tags-wrap");
        if (item.tags && item.tags.length > 0) {
          const tagsHtml = item.tags.map(t => `<span class="tree-file-tag" title="Tag: ${this.escapeHtml(t)}">${this.escapeHtml(t)}</span>`).join("");
          if (!tagsWrap) {
            tagsWrap = document.createElement("div");
            tagsWrap.className = "tree-node-tags-wrap";
            const nameEl = row.querySelector(".item-name");
            if (nameEl) nameEl.after(tagsWrap);
            else row.appendChild(tagsWrap);
          }
          tagsWrap.innerHTML = tagsHtml;
        } else if (tagsWrap) {
          tagsWrap.remove();
        }
      }
    });

    if (this.explorerGroupBySelect && this.explorerGroupBySelect.value === "tag") {
      this.refreshExplorerTree(true);
    }
  }

  clearFileProperties() {
    this.selectedPropertyItem = null;
    if (this.propEmptyNotice) this.propEmptyNotice.classList.remove("hidden");
    if (this.propDetailsCard) this.propDetailsCard.classList.add("hidden");
    if (this.btnClearProperties) this.btnClearProperties.classList.add("hidden");
    if (this.propTagsList) this.propTagsList.innerHTML = "";
    if (this.propTagsCount) this.propTagsCount.textContent = "0";
    if (this.propNewTagInput) this.propNewTagInput.value = "";
  }

  updateOpenEditors() {
    if (!this.bodyOpenEditors) {
      this.bodyOpenEditors = document.getElementById("bodyOpenEditors");
    }
    if (!this.bodyOpenEditors) return;

    if (!this.openTabs || this.openTabs.length === 0) {
      this.bodyOpenEditors.innerHTML = `<div id="noOpenEditors" class="tree-empty-hint">No active session</div>`;
      return;
    }

    this.bodyOpenEditors.innerHTML = "";
    this.openTabs.forEach((tab) => {
      const row = document.createElement("div");
      const isActive = tab.id === this.activeTabId;
      row.className = `open-editor-row ${isActive ? "active" : ""}`;
      row.title = tab.filename;
      row.innerHTML = `
        <span class="file-icon-wrap" style="margin-right: 6px; font-size: 13px;">🎬</span>
        <span class="item-name">${this.escapeHtml(tab.filename)}</span>
        <button class="open-editor-close" title="Close Tab (Ctrl+W)">&times;</button>
        ${isActive ? '<span class="active-dot" style="margin-left: 4px; font-size: 10px; color: #38bdf8;">●</span>' : ''}
      `;

      row.addEventListener("click", () => {
        this.switchWorkspaceTab(tab.id);
        this.showWorkspaceView();
      });

      const closeBtn = row.querySelector(".open-editor-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.closeWorkspaceTab(tab.id);
        });
      }

      this.bodyOpenEditors.appendChild(row);
    });
  }

  applyTreeFilter() {
    if (!this.explorerTreeView) return;
    const query = this.explorerSearchInput ? this.explorerSearchInput.value.toLowerCase().trim() : "";
    const mediaOnly = this.mediaOnlyFilter;

    this.explorerTreeView.querySelectorAll(".tree-node.file-node").forEach((row) => {
      const name = row.dataset.name || "";
      const tags = row.dataset.tags || "";
      const isMedia = row.dataset.isMedia === "true";
      const matchesQuery = !query || name.includes(query) || tags.includes(query);
      const matchesMedia = !mediaOnly || isMedia;

      const visible = matchesQuery && matchesMedia;
      row.style.display = visible ? "flex" : "none";
      if (row.parentElement && row.parentElement.classList.contains("tree-node-wrap")) {
        row.parentElement.style.display = visible ? "" : "none";
      }
    });

    // Handle directory visibility based on whether any child files are visible
    this.explorerTreeView.querySelectorAll(".tree-node.folder-node").forEach((row) => {
      const wrap = row.closest(".tree-node-wrap");
      if (wrap) {
        if (!query && !mediaOnly) {
          row.style.display = "flex";
          wrap.style.display = "";
        } else {
          const hasVisibleFiles = wrap.querySelectorAll('.tree-node.file-node[style*="display: flex"]').length > 0;
          wrap.style.display = hasVisibleFiles ? "" : "none";
        }
      }
    });
  }

  openTranscribePathModal(item) {
    this.selectedTranscribeFilePath = item.path;
    if (this.transcribePathFileName) this.transcribePathFileName.textContent = item.name;
    if (this.transcribePathFileSize) this.transcribePathFileSize.textContent = this.formatFileSize(item.size || 0);
    if (this.transcribePathFullLocation) this.transcribePathFullLocation.textContent = item.path;
    if (this.transcribePathExtBadge) {
      this.transcribePathExtBadge.textContent = (item.ext || "file").replace(".", "").toUpperCase();
    }
    if (this.transcribePathModal) {
      this.transcribePathModal.classList.remove("hidden");
    }
  }

  closeTranscribePathModal() {
    this.selectedTranscribeFilePath = null;
    if (this.transcribePathModal) {
      this.transcribePathModal.classList.add("hidden");
    }
  }

  async startProcessingPath() {
    const filePath = this.selectedTranscribeFilePath;
    if (!filePath) return;

    const modelSize = document.querySelector('input[name="pathModelSize"]:checked')?.value || "tiny";
    const langMode = document.querySelector('input[name="pathLanguageMode"]:checked')?.value || "en";

    this.closeTranscribePathModal();
    this.openProgressModal();

    try {
      const resp = await fetch("/api/process-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: filePath,
          model_size: modelSize,
          language_mode: langMode
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Processing failed");
      }

      const res = await resp.json();
      if (res.cached && res.transcript_id) {
        this.showToast(res.message, "success");
        this.closeProgressModal();
        this.loadTranscript(res.transcript_id);
        this.highlightActiveTreeFile(filePath);
      } else if (res.job_id) {
        this.subscribeJobProgress(res.job_id);
        this.highlightActiveTreeFile(filePath);
      }
    } catch (e) {
      this.closeProgressModal();
      this.showToast(e.message || "Processing failed", "error");
    }
  }

  // ==========================================================================
  // BACKEND SETTINGS & DATABASE EXPLORER
  // ==========================================================================

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  initDbExplorer() {
    // 1. Subtab Switching
    const subtabs = document.querySelectorAll(".db-subtab");
    subtabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        subtabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const tabKey = tab.dataset.tab;
        const dbTableContainer = document.getElementById("dbTableContainer");
        const dbSqlContainer = document.getElementById("dbSqlContainer");
        const dbSystemContainer = document.getElementById("dbSystemContainer");
        const dbFilterWrap = document.getElementById("dbFilterWrap");

        if (tabKey === "sql") {
          if (dbTableContainer) dbTableContainer.classList.add("hidden");
          if (dbSystemContainer) dbSystemContainer.classList.add("hidden");
          if (dbSqlContainer) dbSqlContainer.classList.remove("hidden");
          if (dbFilterWrap) dbFilterWrap.classList.add("hidden");
        } else if (tabKey === "system") {
          if (dbTableContainer) dbTableContainer.classList.add("hidden");
          if (dbSqlContainer) dbSqlContainer.classList.add("hidden");
          if (dbSystemContainer) dbSystemContainer.classList.remove("hidden");
          if (dbFilterWrap) dbFilterWrap.classList.add("hidden");
        } else {
          if (dbSqlContainer) dbSqlContainer.classList.add("hidden");
          if (dbSystemContainer) dbSystemContainer.classList.add("hidden");
          if (dbTableContainer) dbTableContainer.classList.remove("hidden");
          if (dbFilterWrap) dbFilterWrap.classList.remove("hidden");
          this.currentDbTable = tabKey;
          this.currentDbPage = 1;
          const searchInput = document.getElementById("dbTableSearchInput");
          if (searchInput) searchInput.value = "";
          this.loadDbTable(tabKey, 1);
        }
      });
    });

    // 2. Quick KPI card clicks switch directly to table tabs
    const kpiCardJobs = document.getElementById("kpiCardJobs");
    if (kpiCardJobs) {
      kpiCardJobs.addEventListener("click", () => {
        const btn = document.querySelector('.db-subtab[data-tab="jobs"]');
        if (btn) btn.click();
      });
      kpiCardJobs.style.cursor = "pointer";
    }

    const kpiCardTranscripts = document.getElementById("kpiCardTranscripts");
    if (kpiCardTranscripts) {
      kpiCardTranscripts.addEventListener("click", () => {
        const btn = document.querySelector('.db-subtab[data-tab="transcripts"]');
        if (btn) btn.click();
      });
      kpiCardTranscripts.style.cursor = "pointer";
    }

    const kpiCardProfiles = document.getElementById("kpiCardProfiles");
    if (kpiCardProfiles) {
      kpiCardProfiles.addEventListener("click", () => {
        const btn = document.querySelector('.db-subtab[data-tab="voice_profiles"]');
        if (btn) btn.click();
      });
      kpiCardProfiles.style.cursor = "pointer";
    }

    // 3. Refresh Action
    const btnDbRefresh = document.getElementById("btnDbRefresh");
    if (btnDbRefresh) {
      btnDbRefresh.addEventListener("click", () => {
        this.loadDbStats();
        const activeSubtab = document.querySelector(".db-subtab.active");
        const key = activeSubtab ? activeSubtab.dataset.tab : "jobs";
        if (key === "sql") {
          this.executeDbQuery();
        } else if (key !== "system") {
          this.loadDbTable(key, this.currentDbPage);
        }
        this.showToast("Database refreshed", "info");
      });
    }

    // 4. Cache Cleanup Actions
    const handleClean = async () => {
      try {
        const resp = await fetch("/api/backend/cleanup-cache", { method: "POST" });
        if (!resp.ok) throw new Error("Cleanup failed");
        const data = await resp.json();
        this.showToast(`Cache purged: ${data.deleted_files || 0} temporary files removed`, "success");
        this.loadDbStats();
      } catch (e) {
        this.showToast(e.message || "Failed to purge cache", "error");
      }
    };

    const btnDbCleanCache = document.getElementById("btnDbCleanCache");
    if (btnDbCleanCache) btnDbCleanCache.addEventListener("click", handleClean);

    const btnSystemCleanMedia = document.getElementById("btnSystemCleanMedia");
    if (btnSystemCleanMedia) btnSystemCleanMedia.addEventListener("click", handleClean);

    // 5. Table Filter Search
    const dbTableSearchInput = document.getElementById("dbTableSearchInput");
    if (dbTableSearchInput) {
      dbTableSearchInput.addEventListener("input", () => this.applyDbTableFilter());
    }

    // 6. Pagination Controls
    const btnDbPrevPage = document.getElementById("btnDbPrevPage");
    if (btnDbPrevPage) {
      btnDbPrevPage.addEventListener("click", () => {
        if (this.currentDbPage > 1) {
          this.loadDbTable(this.currentDbTable, this.currentDbPage - 1);
        }
      });
    }

    const btnDbNextPage = document.getElementById("btnDbNextPage");
    if (btnDbNextPage) {
      btnDbNextPage.addEventListener("click", () => {
        this.loadDbTable(this.currentDbTable, this.currentDbPage + 1);
      });
    }

    // 7. SQL Console Actions & Chips
    const btnRunSqlQuery = document.getElementById("btnRunSqlQuery");
    if (btnRunSqlQuery) {
      btnRunSqlQuery.addEventListener("click", () => this.executeDbQuery());
    }

    const sqlChips = document.querySelectorAll(".sql-chip");
    sqlChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const query = chip.dataset.query;
        const input = document.getElementById("sqlQueryInput");
        if (input && query) {
          input.value = query;
          this.executeDbQuery();
        }
      });
    });

    // 8. DB Detail Modal Close & Copy
    const btnCloseDbDetailModal = document.getElementById("btnCloseDbDetailModal");
    if (btnCloseDbDetailModal) btnCloseDbDetailModal.addEventListener("click", () => this.closeDbDetailModal());

    const btnCloseDbDetailModalBottom = document.getElementById("btnCloseDbDetailModalBottom");
    if (btnCloseDbDetailModalBottom) btnCloseDbDetailModalBottom.addEventListener("click", () => this.closeDbDetailModal());

    const btnCopyDbDetailJson = document.getElementById("btnCopyDbDetailJson");
    if (btnCopyDbDetailJson) {
      btnCopyDbDetailJson.addEventListener("click", () => {
        const pre = document.getElementById("dbDetailJsonPre");
        if (pre && pre.textContent) {
          navigator.clipboard.writeText(pre.textContent).then(() => {
            this.showToast("Record JSON copied to clipboard", "success");
          });
        }
      });
    }

    // 9. Database Path Selection, Creation & Dynamic Switching
    const inputActiveDbPath = document.getElementById("inputActiveDbPath");
    const btnBrowseDbFile = document.getElementById("btnBrowseDbFile");
    const btnCreateNewDbFile = document.getElementById("btnCreateNewDbFile");
    const btnApplyDbPath = document.getElementById("btnApplyDbPath");
    const btnResetDefaultDb = document.getElementById("btnResetDefaultDb");
    const btnCopyActiveDbPath = document.getElementById("btnCopyActiveDbPath");
    const btnSysBrowseDb = document.getElementById("btnSysBrowseDb");
    const btnSysShowInFolder = document.getElementById("btnSysShowInFolder");
    const btnNavDbLocation = document.getElementById("btnNavDbLocation");

    if (btnBrowseDbFile) {
      btnBrowseDbFile.addEventListener("click", async () => {
        let chosenPath = null;
        if (window.electronAPI && window.electronAPI.selectDbFileDialog) {
          chosenPath = await window.electronAPI.selectDbFileDialog();
        } else {
          chosenPath = prompt("Enter path to existing SQLite database file (.db):", inputActiveDbPath ? inputActiveDbPath.value : "");
        }
        if (chosenPath && chosenPath.trim()) {
          if (inputActiveDbPath) inputActiveDbPath.value = chosenPath.trim();
          await this.switchDatabase(chosenPath.trim());
        }
      });
    }

    if (btnCreateNewDbFile) {
      btnCreateNewDbFile.addEventListener("click", async () => {
        let chosenPath = null;
        if (window.electronAPI && window.electronAPI.createDbFileDialog) {
          chosenPath = await window.electronAPI.createDbFileDialog();
        } else {
          chosenPath = prompt("Enter path for new SQLite database file (.db):", inputActiveDbPath ? inputActiveDbPath.value : "");
        }
        if (chosenPath && chosenPath.trim()) {
          if (inputActiveDbPath) inputActiveDbPath.value = chosenPath.trim();
          await this.switchDatabase(chosenPath.trim());
        }
      });
    }

    if (btnApplyDbPath) {
      btnApplyDbPath.addEventListener("click", async () => {
        const val = inputActiveDbPath ? inputActiveDbPath.value.trim() : "";
        if (!val) {
          this.showToast("Please enter or select a database file path", "warning");
          return;
        }
        await this.switchDatabase(val);
      });
    }

    if (btnResetDefaultDb) {
      btnResetDefaultDb.addEventListener("click", async () => {
        await this.switchDatabase(null, true);
      });
    }

    if (btnCopyActiveDbPath) {
      btnCopyActiveDbPath.addEventListener("click", () => {
        const pathVal = inputActiveDbPath ? inputActiveDbPath.value.trim() : (this.currentDbPath || "");
        if (pathVal) {
          navigator.clipboard.writeText(pathVal).then(() => {
            this.showToast("Database path copied to clipboard", "success");
          });
        }
      });
    }

    if (btnSysBrowseDb) {
      btnSysBrowseDb.addEventListener("click", () => {
        if (btnBrowseDbFile) btnBrowseDbFile.click();
      });
    }

    if (btnSysShowInFolder) {
      btnSysShowInFolder.addEventListener("click", () => {
        const pathVal = this.currentDbPath;
        if (pathVal && window.electronAPI && window.electronAPI.showInFolder) {
          window.electronAPI.showInFolder(pathVal);
        } else {
          this.showToast(pathVal || "No active database file path", "info");
        }
      });
    }

    if (btnNavDbLocation) {
      btnNavDbLocation.addEventListener("click", () => {
        this.showBackendSettingsView();
        if (inputActiveDbPath) {
          inputActiveDbPath.focus();
          inputActiveDbPath.select();
        }
      });
    }

    // 10. AI Models Folder Selection, Application & Dynamic Switching
    const inputActiveModelsPath = document.getElementById("inputActiveModelsPath");
    const btnBrowseModelsFolder = document.getElementById("btnBrowseModelsFolder");
    const btnApplyModelsPath = document.getElementById("btnApplyModelsPath");
    const btnResetDefaultModels = document.getElementById("btnResetDefaultModels");
    const btnCopyActiveModelsPath = document.getElementById("btnCopyActiveModelsPath");

    if (btnBrowseModelsFolder) {
      btnBrowseModelsFolder.addEventListener("click", async () => {
        let chosenPath = null;
        if (window.electronAPI && window.electronAPI.openFolderDialog) {
          chosenPath = await window.electronAPI.openFolderDialog();
        } else {
          chosenPath = prompt("Enter path to AI Models directory:", inputActiveModelsPath ? inputActiveModelsPath.value : "");
        }
        if (chosenPath && chosenPath.trim()) {
          if (inputActiveModelsPath) inputActiveModelsPath.value = chosenPath.trim();
          await this.switchModelsDirectory(chosenPath.trim());
        }
      });
    }

    if (btnApplyModelsPath) {
      btnApplyModelsPath.addEventListener("click", async () => {
        const val = inputActiveModelsPath ? inputActiveModelsPath.value.trim() : "";
        if (!val) {
          this.showToast("Please enter or select an AI models folder path", "warning");
          return;
        }
        await this.switchModelsDirectory(val);
      });
    }

    if (btnResetDefaultModels) {
      btnResetDefaultModels.addEventListener("click", async () => {
        await this.switchModelsDirectory(null, true);
      });
    }

    if (btnCopyActiveModelsPath) {
      btnCopyActiveModelsPath.addEventListener("click", () => {
        const pathVal = inputActiveModelsPath ? inputActiveModelsPath.value.trim() : (this.currentModelsPath || "");
        if (pathVal) {
          navigator.clipboard.writeText(pathVal).then(() => {
            this.showToast("Models directory copied to clipboard", "success");
          });
        }
      });
    }
  }


  async switchDatabase(dbPath, resetToDefault = false) {
    try {
      this.showToast("Switching database connection...", "info");
      const resp = await fetch("/api/backend/db-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          db_path: resetToDefault ? null : dbPath,
          reset_to_default: resetToDefault
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Failed to switch database");
      }

      const res = await resp.json();
      const updatedPath = res.current_db_path;
      this.currentDbPath = updatedPath;

      // Persist in desktop electron app config
      if (window.electronAPI && window.electronAPI.setConfiguredDbPath) {
        await window.electronAPI.setConfiguredDbPath(resetToDefault ? null : updatedPath);
      }

      const inputActiveDbPath = document.getElementById("inputActiveDbPath");
      if (inputActiveDbPath) inputActiveDbPath.value = updatedPath;

      const dbName = updatedPath.split(/[\\/]/).pop() || "database";
      const msg = resetToDefault
        ? "Switched to default app storage database"
        : `Connected to separate database: ${dbName}`;
      this.showToast(msg, "success");

      // Refresh DB stats, tables, and home recent sessions
      await this.loadDbStats();
      this.loadDbTable(this.currentDbTable || "jobs", 1);
      this.loadHomeRecentSessions();
    } catch (e) {
      console.error("Database switch error:", e);
      this.showToast(e.message || "Failed to connect to database", "error");
    }
  }

  async switchModelsDirectory(modelsPath, resetToDefault = false) {
    try {
      this.showToast(resetToDefault ? "Resetting models directory..." : "Switching models directory...", "info");
      const resp = await fetch("/api/backend/models-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          models_dir: resetToDefault ? null : modelsPath,
          reset_to_default: resetToDefault
        })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Failed to update models directory");
      }

      const res = await resp.json();
      const folderName = res.current_models_dir.split(/[\\/]/).pop() || "models";
      this.showToast(resetToDefault ? "Reset to bundled models directory" : `Loaded models from: ${folderName}`, "success");
      await this.loadModelsInfo();
    } catch (e) {
      console.error("Models directory switch error:", e);
      this.showToast(e.message || "Failed to update models directory", "error");
    }
  }


  async loadDbStats() {
    try {
      const resp = await fetch("/api/db/stats");
      if (!resp.ok) return;
      const data = await resp.json();

      this.currentDbPath = data.db_path || "";
      const inputActiveDbPath = document.getElementById("inputActiveDbPath");
      if (inputActiveDbPath) inputActiveDbPath.value = data.db_path || "";

      const dbStorageTypeBadge = document.getElementById("dbStorageTypeBadge");
      if (dbStorageTypeBadge) {
        if (data.is_custom) {
          dbStorageTypeBadge.textContent = "Custom External DB";
          dbStorageTypeBadge.className = "db-type-badge custom";
        } else {
          dbStorageTypeBadge.textContent = "Default Storage";
          dbStorageTypeBadge.className = "db-type-badge default";
        }
      }

      const sysDbBadge = document.getElementById("sysDbBadge");
      if (sysDbBadge) {
        if (data.is_custom) {
          sysDbBadge.textContent = "Custom External";
          sysDbBadge.className = "db-type-badge custom";
        } else {
          sysDbBadge.textContent = "Default";
          sysDbBadge.className = "db-type-badge default";
        }
      }

      const dbSizeBytes = data.file_size || data.db_size_bytes || 0;
      const jobsCount = data.jobs_count ?? data.tables?.jobs?.count ?? 0;
      const transcriptsCount = data.transcripts_count ?? data.tables?.transcripts?.count ?? 0;
      const profilesCount = data.profiles_count ?? data.tables?.voice_profiles?.count ?? 0;

      // KPI card updates
      const kpiDbSize = document.getElementById("kpiDbSize");
      if (kpiDbSize) kpiDbSize.textContent = this.formatBytes(dbSizeBytes);

      const kpiDbPath = document.getElementById("kpiDbPath");
      if (kpiDbPath) kpiDbPath.textContent = data.db_path ? data.db_path.split(/[\\/]/).pop() : "whosaid.db";

      const kpiJobsCount = document.getElementById("kpiJobsCount");
      if (kpiJobsCount) kpiJobsCount.textContent = jobsCount.toLocaleString();

      const kpiTranscriptsCount = document.getElementById("kpiTranscriptsCount");
      if (kpiTranscriptsCount) kpiTranscriptsCount.textContent = transcriptsCount.toLocaleString();

      const kpiProfilesCount = document.getElementById("kpiProfilesCount");
      if (kpiProfilesCount) kpiProfilesCount.textContent = profilesCount.toLocaleString();

      // Subtab badges
      const tabCountJobs = document.getElementById("tabCountJobs");
      if (tabCountJobs) tabCountJobs.textContent = data.jobs_count || 0;

      const tabCountTranscripts = document.getElementById("tabCountTranscripts");
      if (tabCountTranscripts) tabCountTranscripts.textContent = data.transcripts_count || 0;

      const tabCountProfiles = document.getElementById("tabCountProfiles");
      if (tabCountProfiles) tabCountProfiles.textContent = data.profiles_count || 0;

      // System tab details
      const sysDbPath = document.getElementById("sysDbPath");
      if (sysDbPath) sysDbPath.textContent = data.db_path || "whosaid.db";

      const sysDbSize = document.getElementById("sysDbSize");
      if (sysDbSize) sysDbSize.textContent = this.formatBytes(data.db_size_bytes || 0);

      const sysUploadsSize = document.getElementById("sysUploadsSize");
      if (sysUploadsSize) sysUploadsSize.textContent = this.formatBytes(data.uploads_size || 0);

      const sysAudioSize = document.getElementById("sysAudioSize");
      if (sysAudioSize) sysAudioSize.textContent = this.formatBytes(data.audio_size || 0);

      const sysServerPort = document.getElementById("sysServerPort");
      if (sysServerPort) sysServerPort.textContent = `${data.server_port || 8000} (localhost)`;

      const sysPlatform = document.getElementById("sysPlatform");
      if (sysPlatform) sysPlatform.textContent = data.platform || "windows";

      const sysFrozenMode = document.getElementById("sysFrozenMode");
      if (sysFrozenMode) sysFrozenMode.textContent = data.frozen ? "Packaged Binary (.exe)" : "Python Source / Dev Mode";

      await this.loadModelsInfo();
    } catch (e) {
      console.error("Error loading DB stats:", e);
    }
  }

  async loadModelsInfo() {
    try {
      const resp = await fetch("/api/backend/models-info");
      if (!resp.ok) return;
      const data = await resp.json();

      this.currentModelsPath = data.models_dir;
      const inputActiveModelsPath = document.getElementById("inputActiveModelsPath");
      if (inputActiveModelsPath) inputActiveModelsPath.value = data.models_dir || "";

      const modelsStorageTypeBadge = document.getElementById("modelsStorageTypeBadge");
      if (modelsStorageTypeBadge) {
        modelsStorageTypeBadge.textContent = data.is_custom ? "Custom" : "Bundled";
      }

      const modelsOfflineStatusBadge = document.getElementById("modelsOfflineStatusBadge");
      if (modelsOfflineStatusBadge) {
        modelsOfflineStatusBadge.textContent = data.offline_ready ? "100% Offline Ready" : "Missing Models";
      }

      const badgeBase = document.getElementById("badgeModelBase");
      const badgeTiny = document.getElementById("badgeModelTiny");
      const badgeSmall = document.getElementById("badgeModelSmall");
      const badgeMedium = document.getElementById("badgeModelMedium");

      const w = data.whisper_models || {};
      if (badgeBase) {
        badgeBase.textContent = w.base?.installed_locally ? "Installed (Offline)" : "Available";
        badgeBase.className = `model-badge ${w.base?.installed_locally ? "installed" : ""}`;
      }
      if (badgeTiny) {
        badgeTiny.textContent = w.tiny?.installed_locally ? "Installed (Offline)" : "Available";
        badgeTiny.className = `model-badge ${w.tiny?.installed_locally ? "installed" : ""}`;
      }
      if (badgeSmall) {
        badgeSmall.textContent = w.small?.installed_locally ? "Installed (Offline)" : "Optional (HF)";
        badgeSmall.className = `model-badge ${w.small?.installed_locally ? "installed" : "optional"}`;
      }
      if (badgeMedium) {
        badgeMedium.textContent = w.medium?.installed_locally ? "Installed (Offline)" : "Optional (HF)";
        badgeMedium.className = `model-badge ${w.medium?.installed_locally ? "installed" : "optional"}`;
      }

      const btnOpenModelsFolder = document.getElementById("btnOpenModelsFolder");
      if (btnOpenModelsFolder && !btnOpenModelsFolder._bound) {
        btnOpenModelsFolder._bound = true;
        btnOpenModelsFolder.addEventListener("click", () => {
          const dir = this.currentModelsPath || data.models_dir;
          if (window.electronAPI && window.electronAPI.showInFolder && dir) {
            window.electronAPI.showInFolder(dir);
          } else if (window.electronAPI && window.electronAPI.openModelsFolder) {
            window.electronAPI.openModelsFolder();
          } else {
            this.showToast(`Models directory: ${dir}`, "info");
          }
        });
      }


      document.querySelectorAll(".link-external-hf").forEach(link => {
        if (!link._bound) {
          link._bound = true;
          link.addEventListener("click", (e) => {
            e.preventDefault();
            const url = link.getAttribute("data-url") || link.href;
            if (window.electronAPI && window.electronAPI.openExternal) {
              window.electronAPI.openExternal(url);
            } else {
              window.open(url, "_blank");
            }
          });
        }
      });
    } catch (e) {
      console.warn("Could not load models info:", e);
    }
  }

  async loadDbTable(tableName, page = 1) {
    this.currentDbTable = tableName;
    this.currentDbPage = page;
    const limit = 50;
    const offset = (page - 1) * limit;

    const tbody = document.getElementById("dbTableTbody");
    const emptyNotice = document.getElementById("dbTableEmptyNotice");
    if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:#94a3b8;">Loading rows...</td></tr>`;
    if (emptyNotice) emptyNotice.classList.add("hidden");

    try {
      const resp = await fetch(`/api/db/table/${tableName}?limit=${limit}&offset=${offset}`);
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Failed to load table data");
      }
      const data = await resp.json();
      this.currentDbTableData = data;
      this.renderDbTable(data);
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:#ef4444;">Error: ${this.escapeHtml(e.message)}</td></tr>`;
      this.showToast(e.message || "Failed to load table rows", "error");
    }
  }

  renderDbTable(data) {
    const thead = document.getElementById("dbTableThead");
    const tbody = document.getElementById("dbTableTbody");
    const emptyNotice = document.getElementById("dbTableEmptyNotice");
    const statusText = document.getElementById("dbTableStatusText");
    const pageNum = document.getElementById("dbPageIndicator");
    const btnPrev = document.getElementById("btnDbPrevPage");
    const btnNext = document.getElementById("btnDbNextPage");

    if (!thead || !tbody) return;

    thead.innerHTML = "";
    tbody.innerHTML = "";

    const columns = data.columns || [];
    const rows = data.rows || [];

    // Header row
    const headTr = document.createElement("tr");
    columns.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col;
      headTr.appendChild(th);
    });
    const thAction = document.createElement("th");
    thAction.textContent = "Action";
    thAction.style.width = "80px";
    headTr.appendChild(thAction);
    thead.appendChild(headTr);

    // Empty state
    if (rows.length === 0) {
      if (emptyNotice) emptyNotice.classList.remove("hidden");
    } else {
      if (emptyNotice) emptyNotice.classList.add("hidden");
    }

    // Populate rows
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.dataset.rowJson = JSON.stringify(row);

      columns.forEach((col) => {
        const td = document.createElement("td");
        const val = row[col];
        if (col === "id" || col.endsWith("_id") || col === "status") {
          td.className = "cell-mono";
        }
        if (val === null || val === undefined) {
          td.innerHTML = '<span style="color:#64748b;font-style:italic;">null</span>';
        } else if (typeof val === "object") {
          td.textContent = JSON.stringify(val);
        } else {
          td.textContent = String(val);
        }
        td.title = String(val ?? "");
        tr.appendChild(td);
      });

      // Actions cell
      const tdAction = document.createElement("td");
      const btnInspect = document.createElement("button");
      btnInspect.className = "btn-inspect-row";
      btnInspect.textContent = "Inspect";
      btnInspect.title = "View formatted JSON record";
      btnInspect.addEventListener("click", () => this.openDbDetailModal(row));
      tdAction.appendChild(btnInspect);
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    });

    // Update status and pagination
    if (statusText) {
      statusText.textContent = `Table: ${data.table} | Showing ${rows.length} rows (offset ${data.offset})`;
    }
    if (pageNum) {
      pageNum.textContent = `Page ${this.currentDbPage}`;
    }
    if (btnPrev) {
      btnPrev.disabled = this.currentDbPage <= 1;
    }
    if (btnNext) {
      btnNext.disabled = rows.length < (data.limit || 50);
    }
  }

  applyDbTableFilter() {
    const searchInput = document.getElementById("dbTableSearchInput");
    if (!searchInput) return;
    const query = searchInput.value.toLowerCase().trim();
    const rows = document.querySelectorAll("#dbTableTbody tr");
    let matchCount = 0;

    rows.forEach((tr) => {
      const rowJson = tr.dataset.rowJson || "";
      const matches = !query || rowJson.toLowerCase().includes(query);
      tr.style.display = matches ? "" : "none";
      if (matches) matchCount++;
    });

    const statusText = document.getElementById("dbTableStatusText");
    if (statusText && this.currentDbTableData) {
      if (query) {
        statusText.textContent = `Filtered: ${matchCount} matching rows for "${query}"`;
      } else {
        statusText.textContent = `Table: ${this.currentDbTableData.table} | Showing ${this.currentDbTableData.rows.length} rows`;
      }
    }
  }

  async executeDbQuery() {
    const sqlInput = document.getElementById("sqlQueryInput");
    const status = document.getElementById("sqlExecutionStatus");
    const thead = document.getElementById("sqlResultsThead");
    const tbody = document.getElementById("sqlResultsTbody");
    const emptyNotice = document.getElementById("sqlResultsEmpty");

    if (!sqlInput) return;
    const query = sqlInput.value.trim();
    if (!query) {
      this.showToast("Please enter a SQL query", "warning");
      return;
    }

    if (status) {
      status.textContent = "Executing query...";
      status.style.color = "#38bdf8";
    }

    const startTime = performance.now();
    try {
      const resp = await fetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });

      const elapsed = (performance.now() - startTime).toFixed(1);

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Query execution failed");
      }

      const res = await resp.json();
      if (thead) thead.innerHTML = "";
      if (tbody) tbody.innerHTML = "";

      const columns = res.columns || [];
      const rows = res.rows || [];

      if (columns.length > 0) {
        const headTr = document.createElement("tr");
        columns.forEach((c) => {
          const th = document.createElement("th");
          th.textContent = c;
          headTr.appendChild(th);
        });
        const thAct = document.createElement("th");
        thAct.textContent = "Action";
        headTr.appendChild(thAct);
        thead.appendChild(headTr);
      }

      if (rows.length === 0) {
        if (emptyNotice) {
          emptyNotice.textContent = `Query executed in ${elapsed}ms: 0 rows returned.`;
          emptyNotice.classList.remove("hidden");
        }
      } else {
        if (emptyNotice) emptyNotice.classList.add("hidden");
        rows.forEach((row) => {
          const tr = document.createElement("tr");
          columns.forEach((c) => {
            const td = document.createElement("td");
            const val = row[c];
            if (val === null || val === undefined) {
              td.innerHTML = '<span style="color:#64748b;font-style:italic;">null</span>';
            } else if (typeof val === "object") {
              td.textContent = JSON.stringify(val);
            } else {
              td.textContent = String(val);
            }
            td.title = String(val ?? "");
            tr.appendChild(td);
          });
          const tdAct = document.createElement("td");
          const btn = document.createElement("button");
          btn.className = "btn-inspect-row";
          btn.textContent = "Inspect";
          btn.addEventListener("click", () => this.openDbDetailModal(row));
          tdAct.appendChild(btn);
          tr.appendChild(tdAct);
          tbody.appendChild(tr);
        });
      }

      if (status) {
        status.textContent = `Success: ${rows.length} rows in ${elapsed}ms`;
        status.style.color = "#4ade80";
      }
    } catch (e) {
      if (status) {
        status.textContent = `Error: ${e.message}`;
        status.style.color = "#ef4444";
      }
      if (emptyNotice) {
        emptyNotice.textContent = `Error: ${e.message}`;
        emptyNotice.classList.remove("hidden");
      }
      this.showToast(e.message || "Query failed", "error");
    }
  }

  openDbDetailModal(rowData) {
    const modal = document.getElementById("dbDetailModal");
    const pre = document.getElementById("dbDetailJsonPre");
    if (!modal || !pre) return;
    try {
      pre.textContent = JSON.stringify(rowData, null, 2);
    } catch (e) {
      pre.textContent = String(rowData);
    }
    modal.classList.remove("hidden");
  }

  closeDbDetailModal() {
    const modal = document.getElementById("dbDetailModal");
    if (modal) modal.classList.add("hidden");
  }

  // ==========================================================================
  // THEME ENGINE (Light / Dark / System)
  // ==========================================================================
  initTheme() {
    const savedTheme = localStorage.getItem("whosaid_theme") || "system";
    this.currentThemeSetting = savedTheme;
    this.applyTheme(savedTheme);

    // Watch OS system preference changes in realtime
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", () => {
        if (this.currentThemeSetting === "system") {
          this.applyTheme("system");
        }
      });
    }
  }

  setTheme(theme) {
    this.currentThemeSetting = theme;
    localStorage.setItem("whosaid_theme", theme);
    this.applyTheme(theme);
    const label = theme.charAt(0).toUpperCase() + theme.slice(1);
    this.showToast(`Theme changed to ${label}`, "info");
  }

  applyTheme(theme) {
    const root = document.documentElement;
    let effectiveDark = true;

    if (theme === "dark") {
      effectiveDark = true;
    } else if (theme === "light") {
      effectiveDark = false;
    } else {
      // system mode
      effectiveDark = !window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    if (effectiveDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.setAttribute("data-theme", "light");
    }

    // Update active icon on header button
    const iconDark = document.getElementById("themeIconDark");
    const iconLight = document.getElementById("themeIconLight");
    const iconSystem = document.getElementById("themeIconSystem");
    if (iconDark && iconLight && iconSystem) {
      iconDark.classList.toggle("hidden", theme !== "dark");
      iconLight.classList.toggle("hidden", theme !== "light");
      iconSystem.classList.toggle("hidden", theme !== "system");
    }

    // Update checkmark indicators in dropdown
    document.querySelectorAll("[data-check-theme]").forEach((indicator) => {
      const t = indicator.getAttribute("data-check-theme");
      indicator.classList.toggle("hidden", t !== theme);
    });
  }

  initWindowControls() {
    const btnWinMinimize = document.getElementById("btnWinMinimize");
    const btnWinMaximize = document.getElementById("btnWinMaximize");
    const btnWinClose = document.getElementById("btnWinClose");
    const iconWinMax = document.getElementById("iconWinMax");
    const iconWinRestore = document.getElementById("iconWinRestore");

    if (btnWinMinimize) {
      btnWinMinimize.addEventListener("click", () => {
        if (window.electronAPI && typeof window.electronAPI.minimizeWindow === "function") {
          window.electronAPI.minimizeWindow();
        } else {
          this.showToast("Minimize is active in Desktop Electron window", "info");
        }
      });
    }

    if (btnWinMaximize) {
      btnWinMaximize.addEventListener("click", async () => {
        if (window.electronAPI && typeof window.electronAPI.maximizeWindow === "function") {
          const isMax = await window.electronAPI.maximizeWindow();
          if (iconWinMax && iconWinRestore) {
            iconWinMax.classList.toggle("hidden", isMax);
            iconWinRestore.classList.toggle("hidden", !isMax);
          }
        } else {
          // Standard web browser fallback: fullscreen toggle
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
            if (iconWinMax && iconWinRestore) {
              iconWinMax.classList.add("hidden");
              iconWinRestore.classList.remove("hidden");
            }
          } else {
            document.exitFullscreen?.().catch(() => {});
            if (iconWinMax && iconWinRestore) {
              iconWinMax.classList.remove("hidden");
              iconWinRestore.classList.add("hidden");
            }
          }
        }
      });
    }

    if (btnWinClose) {
      btnWinClose.addEventListener("click", () => {
        if (window.electronAPI && typeof window.electronAPI.closeWindow === "function") {
          window.electronAPI.closeWindow();
        } else {
          this.showToast("Close is active in Desktop Electron window", "info");
        }
      });
    }

    // Listen for state change notification from Electron process
    if (window.electronAPI && typeof window.electronAPI.onWindowStateChange === "function") {
      window.electronAPI.onWindowStateChange((state) => {
        if (iconWinMax && iconWinRestore) {
          iconWinMax.classList.toggle("hidden", state.isMaximized);
          iconWinRestore.classList.toggle("hidden", !state.isMaximized);
        }
      });
    }
  }

  updateAvailableModelsInModals() {
    if (!this.modelsInfo || !this.modelsInfo.models) return;

    // 1. Upload modal: only show available models
    const uploadPills = document.querySelectorAll("#uploadModalModelPills .model-pill");
    let firstUploadFound = null;
    let anyUploadChecked = false;

    uploadPills.forEach((pill) => {
      const radio = pill.querySelector("input[name='modelSize']");
      if (!radio) return;
      const modelKey = radio.value;
      const isInstalled = Boolean(this.modelsInfo.models[modelKey]?.installed);

      if (isInstalled) {
        pill.style.display = "";
        pill.classList.remove("hidden");
        if (radio.checked) anyUploadChecked = true;
        if (!firstUploadFound) {
          firstUploadFound = radio;
        }
      } else {
        pill.style.display = "none";
        pill.classList.add("hidden");
        radio.checked = false;
      }
    });

    if (!anyUploadChecked && firstUploadFound) {
      firstUploadFound.checked = true;
    }

    // 2. Transcribe Path modal: only show available models
    const pathPills = document.querySelectorAll("#transcribePathModal .model-pills .model-pill");
    let firstPathFound = null;
    let anyPathChecked = false;

    pathPills.forEach((pill) => {
      const radio = pill.querySelector("input[name='pathModelSize']");
      if (!radio) return;
      const modelKey = radio.value;
      const isInstalled = Boolean(this.modelsInfo.models[modelKey]?.installed);

      if (isInstalled) {
        pill.style.display = "";
        pill.classList.remove("hidden");
        if (radio.checked) anyPathChecked = true;
        if (!firstPathFound) {
          firstPathFound = radio;
        }
      } else {
        pill.style.display = "none";
        pill.classList.add("hidden");
        radio.checked = false;
      }
    });

    if (!anyPathChecked && firstPathFound) {
      firstPathFound.checked = true;
    }
  }
}

// Bootstrap on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new WhoSaidApp();
});

