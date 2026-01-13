let resumes = [];
let selectedResumeId = null;
let settings = {
  autoUpload: false,
  notifications: true,
  darkMode: false,
  defaultResumeId: null,
};
let uploadHistory = [];
let currentEditingUploadId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  setupEventListeners();
  applyTheme();
  updateAnalytics();
});

async function loadData() {
  const result = await chrome.storage.local.get([
    "resumes",
    "selectedResumeId",
    "settings",
    "uploadHistory",
  ]);
  resumes = result.resumes || [];
  selectedResumeId = result.selectedResumeId || null;
  settings = { ...settings, ...(result.settings || {}) };
  uploadHistory = result.uploadHistory || [];

  renderResumeList();
  renderSettings();
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  // Theme toggle
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  // Upload area
  const uploadArea = document.getElementById("uploadArea");
  const fileInput = document.getElementById("fileInput");

  uploadArea.addEventListener("click", () => fileInput.click());
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });
  uploadArea.addEventListener("dragleave", () =>
    uploadArea.classList.remove("dragover")
  );
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  });

  // Buttons
  document
    .getElementById("uploadToPageBtn")
    .addEventListener("click", uploadToPage);
  document.getElementById("clearAllBtn").addEventListener("click", clearAll);
  document
    .getElementById("clearHistoryBtn")
    .addEventListener("click", clearHistory);

  // Settings toggles
  document
    .getElementById("autoUploadToggle")
    .addEventListener("click", () => toggleSetting("autoUpload"));
  document
    .getElementById("notificationsToggle")
    .addEventListener("click", () => toggleSetting("notifications"));
  document
    .getElementById("darkModeToggle")
    .addEventListener("click", () => toggleSetting("darkMode"));
  document
    .getElementById("defaultResumeSelect")
    .addEventListener("change", (e) => {
      settings.defaultResumeId = e.target.value || null;
      saveSettings();
    });

  // Preview modal
  document
    .getElementById("closePreview")
    .addEventListener("click", closePreview);
  document.getElementById("previewModal").addEventListener("click", (e) => {
    if (e.target.id === "previewModal") closePreview();
  });

  // Upload details modal
  document
    .getElementById("closeUploadDetails")
    .addEventListener("click", closeUploadDetailsModal);
  document
    .getElementById("uploadDetailsModal")
    .addEventListener("click", (e) => {
      if (e.target.id === "uploadDetailsModal") closeUploadDetailsModal();
    });
  document
    .getElementById("saveUploadDetails")
    .addEventListener("click", saveUploadDetails);
}

function switchTab(tabName) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));

  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}Content`).classList.add("active");

  if (tabName === "analytics") updateAnalytics();
}

function toggleTheme() {
  settings.darkMode = !settings.darkMode;
  saveSettings();
  applyTheme();
  updateSettingsUI();
}

function applyTheme() {
  if (settings.darkMode) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}

function renderResumeList() {
  const listEl = document.getElementById("resumeList");
  const emptyState = document.getElementById("emptyState");

  if (resumes.length === 0) {
    listEl.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  listEl.innerHTML = resumes
    .map(
      (resume) => `
    <div class="resume-item ${
      resume.id === selectedResumeId ? "selected" : ""
    }" data-id="${resume.id}">
      <div class="resume-info" data-id="${resume.id}">
        <svg class="file-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <div class="resume-details">
          <div class="resume-name" data-id="${resume.id}">${escapeHtml(
        resume.displayName || resume.name
      )}</div>
          <div class="resume-meta">${formatFileSize(
            resume.size
          )} • ${formatDate(resume.uploadedAt)}</div>
        </div>
      </div>
      <div class="resume-actions">
        ${
          resume.id === selectedResumeId
            ? `
          <button class="icon-button" title="Selected">
            <svg class="check-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>
        `
            : `
          <button class="icon-button select-btn" data-id="${resume.id}" title="Select">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </button>
        `
        }
        <button class="icon-button preview-btn" data-id="${
          resume.id
        }" title="Preview">
          <svg class="eye-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </button>
        <button class="icon-button edit edit-btn" data-id="${
          resume.id
        }" title="Rename">
          <svg class="edit-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button class="icon-button delete delete-btn" data-id="${
          resume.id
        }" title="Delete">
          <svg class="trash-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  `
    )
    .join("");

  // Event listeners
  document.querySelectorAll(".resume-info").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (!e.target.closest("input")) selectResume(el.dataset.id);
    });
  });

  document.querySelectorAll(".select-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectResume(btn.dataset.id);
    });
  });

  document.querySelectorAll(".preview-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      previewResume(btn.dataset.id);
    });
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      startRenaming(btn.dataset.id);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteResume(btn.dataset.id);
    });
  });
}

async function handleFileUpload(file) {
  if (file.type !== "application/pdf") {
    showStatus("Please upload a PDF file only", "error");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showStatus("File size must be less than 10MB", "error");
    return;
  }

  try {
    const base64 = await readFileAsBase64(file);

    let displayName = file.name;
    if (displayName.length > 35) {
      const ext = displayName.substring(displayName.lastIndexOf("."));
      displayName = displayName.substring(0, 32 - ext.length) + "..." + ext;
    }

    const newResume = {
      id: generateId(),
      name: file.name,
      displayName: displayName,
      size: file.size,
      type: file.type,
      data: base64,
      uploadedAt: Date.now(),
      usageCount: 0,
    };

    resumes.push(newResume);

    if (resumes.length === 1) {
      selectedResumeId = newResume.id;
    }

    await chrome.storage.local.set({ resumes, selectedResumeId });
    await loadData();

    showStatus("Resume uploaded successfully!", "success");
    document.getElementById("fileInput").value = "";
  } catch (error) {
    showStatus("Failed to upload: " + error.message, "error");
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function selectResume(id) {
  selectedResumeId = id;
  await chrome.storage.local.set({ selectedResumeId });
  renderResumeList();
  showStatus("Resume selected", "success");
}

function previewResume(id) {
  const resume = resumes.find((r) => r.id === id);
  if (!resume) return;

  const modal = document.getElementById("previewModal");
  const iframe = document.getElementById("previewFrame");

  iframe.src = resume.data;
  modal.classList.add("active");
}

function closePreview() {
  const modal = document.getElementById("previewModal");
  const iframe = document.getElementById("previewFrame");

  modal.classList.remove("active");
  iframe.src = "";
}

function startRenaming(id) {
  const resume = resumes.find((r) => r.id === id);
  if (!resume) return;

  const nameElement = document.querySelector(`.resume-name[data-id="${id}"]`);
  if (!nameElement) return;

  const currentName = resume.displayName || resume.name;
  nameElement.innerHTML = `<input type="text" value="${escapeHtml(
    currentName
  )}" data-id="${id}" maxlength="40" />`;

  const input = nameElement.querySelector("input");
  input.focus();
  input.select();

  const saveRename = async () => {
    let newName = input.value.trim();
    if (newName && newName !== currentName) {
      if (newName.length > 35) {
        newName = newName.substring(0, 32) + "...";
      }
      resume.displayName = newName;
      await chrome.storage.local.set({ resumes });
      showStatus("Resume renamed", "success");
    }
    renderResumeList();
  };

  input.addEventListener("blur", saveRename);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    } else if (e.key === "Escape") {
      renderResumeList();
    }
  });

  input.addEventListener("click", (e) => e.stopPropagation());
}

async function deleteResume(id) {
  if (!confirm("Are you sure you want to delete this resume?")) return;

  resumes = resumes.filter((r) => r.id !== id);

  if (selectedResumeId === id) {
    selectedResumeId = resumes.length > 0 ? resumes[0].id : null;
  }

  await chrome.storage.local.set({ resumes, selectedResumeId });
  await loadData();
  showStatus("Resume deleted", "success");
}

async function clearAll() {
  if (!confirm("Delete all resumes?")) return;

  resumes = [];
  selectedResumeId = null;

  await chrome.storage.local.set({ resumes, selectedResumeId });
  await loadData();
  showStatus("All resumes cleared", "success");
}

async function uploadToPage() {
  if (!selectedResumeId) {
    showStatus("Please select a resume first", "error");
    return;
  }

  const resume = resumes.find((r) => r.id === selectedResumeId);
  if (!resume) {
    showStatus("Selected resume not found", "error");
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: uploadResumeToPage,
      args: [resume, settings.notifications],
    });

    // Track upload
    resume.usageCount = (resume.usageCount || 0) + 1;
    const upload = {
      id: generateId(),
      resumeId: resume.id,
      resumeName: resume.displayName || resume.name,
      site: new URL(tab.url).hostname,
      url: tab.url,
      timestamp: Date.now(),
      company: "",
      position: "",
      status: "applied",
      reminder: null,
    };
    uploadHistory.unshift(upload);
    if (uploadHistory.length > 100) uploadHistory = uploadHistory.slice(0, 100);

    await chrome.storage.local.set({ resumes, uploadHistory });

    showStatus("Resume uploaded!", "success");

    // Show upload details modal
    setTimeout(() => openUploadDetailsModal(upload.id), 500);
  } catch (error) {
    showStatus("Failed: " + error.message, "error");
  }
}

function uploadResumeToPage(resume, showNotifications) {
  const fileInputs = document.querySelectorAll('input[type="file"]');

  if (fileInputs.length === 0) {
    if (showNotifications) alert("No file upload fields found");
    return;
  }

  const base64Data = resume.data.split(",")[1];
  const binaryData = atob(base64Data);
  const bytes = new Uint8Array(binaryData.length);

  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: resume.type });
  const file = new File([blob], resume.name, {
    type: resume.type,
    lastModified: Date.now(),
  });

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  let count = 0;

  fileInputs.forEach((input) => {
    const accept = input.getAttribute("accept");
    if (
      !accept ||
      accept.includes(".pdf") ||
      accept.includes("application/pdf") ||
      accept === "*"
    ) {
      try {
        input.files = dataTransfer.files;
        ["input", "change", "blur"].forEach((e) =>
          input.dispatchEvent(new Event(e, { bubbles: true }))
        );
        count++;
      } catch (e) {}
    }
  });

  if (showNotifications && count > 0) {
    const notif = document.createElement("div");
    notif.style.cssText = `position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:9999999;font:500 13px system-ui;animation:slideIn 0.3s`;
    notif.textContent = `✓ Resume uploaded to ${count} field${
      count > 1 ? "s" : ""
    }`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }
}

// Analytics
function updateAnalytics() {
  document.getElementById("totalUploads").textContent = uploadHistory.length;

  const uniqueSites = new Set(uploadHistory.map((u) => u.site)).size;
  document.getElementById("uniqueSites").textContent = uniqueSites;

  // Most used resume
  const resumeUsage = {};
  uploadHistory.forEach((u) => {
    resumeUsage[u.resumeId] = (resumeUsage[u.resumeId] || 0) + 1;
  });
  const mostUsedId = Object.keys(resumeUsage).sort(
    (a, b) => resumeUsage[b] - resumeUsage[a]
  )[0];
  const mostUsed = resumes.find((r) => r.id === mostUsedId);
  document.getElementById("mostUsedResume").textContent = mostUsed
    ? (mostUsed.displayName || mostUsed.name).substring(0, 10)
    : "-";

  // Last upload
  if (uploadHistory.length > 0) {
    document.getElementById("lastUpload").textContent = formatDate(
      uploadHistory[0].timestamp
    );
  }

  // Upload history
  const historyEl = document.getElementById("uploadHistory");
  if (uploadHistory.length === 0) {
    historyEl.innerHTML =
      '<div class="empty-state"><div class="empty-text">No uploads yet</div></div>';
  } else {
    historyEl.innerHTML = uploadHistory
      .slice(0, 15)
      .map(
        (u) => `
      <div class="upload-entry" data-upload-id="${u.id}">
        <div class="upload-entry-header">
          <div class="upload-site">${escapeHtml(u.site)}</div>
          <div class="upload-time">${formatDate(u.timestamp)}</div>
        </div>
        <div class="upload-details">
          <div class="upload-detail-row">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span>${escapeHtml(u.resumeName)}</span>
          </div>
          ${
            u.company
              ? `
            <div class="upload-detail-row">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              <span>${escapeHtml(u.company)}</span>
            </div>
          `
              : ""
          }
          ${
            u.position
              ? `
            <div class="upload-detail-row">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <span>${escapeHtml(u.position)}</span>
            </div>
          `
              : ""
          }
          <div class="upload-detail-row">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="status-badge status-${u.status}">${u.status}</span>
          </div>
          ${
            u.reminder
              ? `
            <div class="upload-detail-row">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
              <span>Reminder: ${new Date(
                u.reminder
              ).toLocaleDateString()}</span>
            </div>
          `
              : ""
          }
        </div>
        <button class="secondary edit-history-btn" style="margin-top: 8px; padding: 6px 10px; font-size: 11px;" data-upload-id="${
          u.id
        }">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          Edit Details
        </button>
      </div>
    `
      )
      .join("");
    // Attach event listeners to the new buttons
    historyEl.querySelectorAll(".edit-history-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        openUploadDetailsModal(btn.dataset.uploadId);
      });
    });
  }
}

// Make editUpload globally accessible
window.editUpload = function (uploadId) {
  openUploadDetailsModal(uploadId);
};

function openUploadDetailsModal(uploadId) {
  const upload = uploadHistory.find((u) => u.id === uploadId);
  if (!upload) return;

  currentEditingUploadId = uploadId;

  document.getElementById("editCompany").value = upload.company || "";
  document.getElementById("editPosition").value = upload.position || "";
  document.getElementById("editStatus").value = upload.status || "applied";
  document.getElementById("editReminder").value = upload.reminder
    ? new Date(upload.reminder).toISOString().split("T")[0]
    : "";

  document.getElementById("uploadDetailsModal").classList.add("active");
}

function closeUploadDetailsModal() {
  document.getElementById("uploadDetailsModal").classList.remove("active");
  currentEditingUploadId = null;
}

async function saveUploadDetails() {
  if (!currentEditingUploadId) return;

  const upload = uploadHistory.find((u) => u.id === currentEditingUploadId);
  if (!upload) return;

  upload.company = document.getElementById("editCompany").value.trim();
  upload.position = document.getElementById("editPosition").value.trim();
  upload.status = document.getElementById("editStatus").value;

  const reminderDate = document.getElementById("editReminder").value;
  upload.reminder = reminderDate ? new Date(reminderDate).getTime() : null;

  await chrome.storage.local.set({ uploadHistory });

  closeUploadDetailsModal();
  updateAnalytics();
  showStatus("Details saved", "success");
}

async function clearHistory() {
  if (!confirm("Clear all upload history?")) return;
  uploadHistory = [];
  await chrome.storage.local.set({ uploadHistory });
  updateAnalytics();
  showStatus("History cleared", "success");
}

// Settings
function renderSettings() {
  updateSettingsUI();

  const select = document.getElementById("defaultResumeSelect");
  select.innerHTML =
    '<option value="">None</option>' +
    resumes
      .map(
        (r) =>
          `<option value="${r.id}" ${
            r.id === settings.defaultResumeId ? "selected" : ""
          }>${escapeHtml(r.displayName || r.name)}</option>`
      )
      .join("");
}

function updateSettingsUI() {
  document
    .getElementById("autoUploadToggle")
    .classList.toggle("active", settings.autoUpload);
  document
    .getElementById("notificationsToggle")
    .classList.toggle("active", settings.notifications);
  document
    .getElementById("darkModeToggle")
    .classList.toggle("active", settings.darkMode);
}

async function toggleSetting(setting) {
  settings[setting] = !settings[setting];
  await saveSettings();
  updateSettingsUI();

  if (setting === "darkMode") applyTheme();
}

async function saveSettings() {
  await chrome.storage.local.set({ settings });
}

// Utilities
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return "now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "d";

  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showStatus(message, type) {
  const status = document.getElementById("status");
  const icon =
    type === "success"
      ? '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      : '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

  status.innerHTML = icon + "<span>" + message + "</span>";
  status.className = `status ${type}`;
  setTimeout(() => (status.className = "status"), 3000);
}
