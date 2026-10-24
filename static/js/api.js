/**
 * WhoSaid Client Engine — API Service Client
 * Encapsulates all offline HTTP endpoints and real-time WebSocket progress connections.
 */

window.WhoSaidApi = (function () {
  async function request(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson && errJson.detail) {
            errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
          }
        } catch (_) {}
        throw new Error(errorDetail);
      }
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return await response.json();
      }
      return await response.text();
    } catch (err) {
      console.error(`[WhoSaidApi] Request error (${url}):`, err);
      throw err;
    }
  }

  return {
    // --- Jobs & Media ---
    getLatestJob: () => request("/api/jobs/latest"),
    getJobStatus: (jobId) => request(`/api/jobs/${encodeURIComponent(jobId)}`),
    
    uploadMedia: (formData) => request("/api/upload", {
      method: "POST",
      body: formData
    }),

    processLocalPath: (filePath, modelSize = "tiny", languageMode = "en") => request("/api/process-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath, model_size: modelSize, language_mode: languageMode })
    }),

    // --- History ---
    getHistory: () => request("/api/history"),
    deleteHistory: (jobId) => request(`/api/history/${encodeURIComponent(jobId)}`, {
      method: "DELETE"
    }),

    // --- Transcripts ---
    getTranscript: (transcriptId) => request(`/api/transcripts/${encodeURIComponent(transcriptId)}`),
    
    updateTranscript: (transcriptId, speakers, segments) => request(`/api/transcripts/${encodeURIComponent(transcriptId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speakers, segments })
    }),

    renameSpeaker: (transcriptId, payload) => request(`/api/transcripts/${encodeURIComponent(transcriptId)}/rename-speaker`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),

    mergeSpeakers: (transcriptId, sourceId, targetId) => request(`/api/transcripts/${encodeURIComponent(transcriptId)}/merge-speakers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_speaker_id: sourceId, target_speaker_id: targetId })
    }),

    getExportUrl: (transcriptId, format, prompt = null) => {
      let url = `/api/transcripts/${encodeURIComponent(transcriptId)}/export/${encodeURIComponent(format)}`;
      if (prompt) {
        url += `?ai_prompt=${encodeURIComponent(prompt)}`;
      }
      return url;
    },

    // --- Voice Profiles ---
    getProfiles: () => request("/api/profiles"),
    deleteProfile: (profileId) => request(`/api/profiles/${encodeURIComponent(profileId)}`, {
      method: "DELETE"
    }),
    createProfile: (formData) => request("/api/profiles", {
      method: "POST",
      body: formData
    }),

    // --- Filesystem Explorer & Tags ---
    scanFolder: (folderPath = null) => {
      const url = folderPath ? `/api/fs/scan-folder?folder_path=${encodeURIComponent(folderPath)}` : "/api/fs/scan-folder";
      return request(url);
    },
    getQuickDirectories: () => request("/api/fs/quick-directories"),
    chooseFolderDialog: (initialDir = null) => request("/api/fs/choose-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initial_dir: initialDir })
    }),
    getFileProperties: (filePath) => request(`/api/fs/file-properties?file_path=${encodeURIComponent(filePath)}`),
    getTags: () => request("/api/fs/tags"),
    addFileTag: (filePath, tag) => request("/api/fs/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath, tag })
    }),
    removeFileTag: (filePath, tag) => request("/api/fs/tags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath, tag })
    }),

    // --- Database & Models Settings ---
    getDbStats: () => request("/api/db/stats"),
    getDbTable: (tableName, limit = 100, offset = 0) => request(`/api/db/table/${encodeURIComponent(tableName)}?limit=${limit}&offset=${offset}`),
    runDbQuery: (query) => request("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    }),
    cleanupCache: () => request("/api/backend/cleanup-cache", { method: "POST" }),
    getDbConfig: () => request("/api/backend/db-config"),
    setDbConfig: (payload) => request("/api/backend/db-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
    getModelsConfig: () => request("/api/backend/models-config"),
    setModelsConfig: (payload) => request("/api/backend/models-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),

    // --- WebSocket Progress Subscription ---
    createJobWebSocket: (jobId, onMessage, onError = null, onClose = null) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws/${encodeURIComponent(jobId)}`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (typeof onMessage === "function") onMessage(data);
        } catch (e) {
          console.warn("[WhoSaidApi] WS parse error:", e);
        }
      };

      if (typeof onError === "function") ws.onerror = onError;
      if (typeof onClose === "function") ws.onclose = onClose;

      return ws;
    }
  };
})();
