let resumes = [];
let selectedResumeId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadResumes();
  setupEventListeners();
});

async function loadResumes() {
  const result = await chrome.storage.local.get([
    "resumes",
    "selectedResumeId",
  ]);
  resumes = result.resumes || [];
  selectedResumeId = result.selectedResumeId || null;

  renderResumeList();
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
      <div class="resume-info">
        <svg class="file-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <div class="resume-details">
          <div class="resume-name">${resume.name}</div>
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
          <button class="icon-button select-btn" data-id="${resume.id}" title="Select this resume">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </button>
        `
        }
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

  // Add event listeners to buttons
  document.querySelectorAll(".select-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectResume(btn.dataset.id);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteResume(btn.dataset.id);
    });
  });
}

function setupEventListeners() {
  const uploadArea = document.getElementById("uploadArea");
  const fileInput = document.getElementById("fileInput");

  uploadArea.addEventListener("click", () => fileInput.click());

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

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

  document
    .getElementById("uploadToPageBtn")
    .addEventListener("click", uploadToPage);
  document.getElementById("clearAllBtn").addEventListener("click", clearAll);
}

async function handleFileUpload(file) {
  // Validate file
  if (file.type !== "application/pdf") {
    showStatus("Please upload a PDF file only", "error");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    // 10MB limit
    showStatus("File size must be less than 10MB", "error");
    return;
  }

  try {
    // Read file as base64
    const base64 = await readFileAsBase64(file);

    const newResume = {
      id: generateId(),
      name: file.name,
      size: file.size,
      type: file.type,
      data: base64,
      uploadedAt: Date.now(),
    };

    resumes.push(newResume);

    // Set as selected if it's the first resume
    if (resumes.length === 1) {
      selectedResumeId = newResume.id;
    }

    await chrome.storage.local.set({ resumes, selectedResumeId });
    await loadResumes();

    showStatus(`${file.name} uploaded successfully!`, "success");

    // Clear file input
    document.getElementById("fileInput").value = "";
  } catch (error) {
    showStatus("Failed to upload file: " + error.message, "error");
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

async function deleteResume(id) {
  if (!confirm("Are you sure you want to delete this resume?")) return;

  resumes = resumes.filter((r) => r.id !== id);

  if (selectedResumeId === id) {
    selectedResumeId = resumes.length > 0 ? resumes[0].id : null;
  }

  await chrome.storage.local.set({ resumes, selectedResumeId });
  await loadResumes();
  showStatus("Resume deleted", "success");
}

async function clearAll() {
  if (!confirm("Are you sure you want to delete all resumes?")) return;

  resumes = [];
  selectedResumeId = null;

  await chrome.storage.local.set({ resumes, selectedResumeId });
  await loadResumes();
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
      args: [resume],
    });

    showStatus("Resume uploaded to page!", "success");
  } catch (error) {
    showStatus("Failed to upload: " + error.message, "error");
  }
}

// This function runs in the context of the web page
function uploadResumeToPage(resume) {
  // Find all file input elements
  const fileInputs = document.querySelectorAll('input[type="file"]');

  if (fileInputs.length === 0) {
    alert("No file upload fields found on this page");
    return;
  }

  // Convert base64 back to File object
  const base64Data = resume.data.split(",")[1];
  const binaryData = atob(base64Data);
  const bytes = new Uint8Array(binaryData.length);

  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: resume.type });
  const file = new File([blob], resume.name, { type: resume.type });

  // Create a DataTransfer object to set the files
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  let uploadedCount = 0;

  // Upload to all visible file inputs
  fileInputs.forEach((input) => {
    // Check if input accepts PDF files
    const accept = input.getAttribute("accept");
    if (
      !accept ||
      accept.includes(".pdf") ||
      accept.includes("application/pdf") ||
      accept === "*"
    ) {
      input.files = dataTransfer.files;

      // Trigger change events
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));

      uploadedCount++;
    }
  });

  if (uploadedCount > 0) {
    // Show success notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
    `;

    notification.textContent = `✓ Resume uploaded to ${uploadedCount} field${
      uploadedCount > 1 ? "s" : ""
    }`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideIn 0.3s ease-out reverse";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

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

  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + " min ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + " hours ago";
  if (diff < 604800000) return Math.floor(diff / 86400000) + " days ago";

  return date.toLocaleDateString();
}

function showStatus(message, type) {
  const status = document.getElementById("status");
  const icon =
    type === "success"
      ? '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      : '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

  status.innerHTML = icon + "<span>" + message + "</span>";
  status.className = `status ${type}`;
  setTimeout(() => {
    status.className = "status";
  }, 3000);
}
