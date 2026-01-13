// Background service worker
// Handles extension initialization, context menu, and keyboard shortcuts

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Resume Pilot installed");

  const result = await chrome.storage.local.get([
    "resumes",
    "settings",
    "uploadHistory",
  ]);
  if (!result.resumes) {
    await chrome.storage.local.set({
      resumes: [],
      selectedResumeId: null,
      settings: {
        autoUpload: false,
        notifications: true,
        darkMode: false,
        defaultResumeId: null,
      },
      uploadHistory: [],
    });
  }

  // Create context menu
  chrome.contextMenus.create({
    id: "upload-resume",
    title: "Upload Resume Here",
    contexts: ["page"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "upload-resume") {
    const result = await chrome.storage.local.get([
      "resumes",
      "selectedResumeId",
      "settings",
    ]);
    const resume = result.resumes?.find(
      (r) => r.id === result.selectedResumeId
    );

    if (resume) {
      await chrome.tabs.sendMessage(tab.id, {
        action: "uploadResume",
        resume: resume,
        showNotifications: result.settings?.notifications !== false,
      });

      // Track upload
      const upload = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
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

      let uploadHistory = result.uploadHistory || [];
      uploadHistory.unshift(upload);
      if (uploadHistory.length > 100)
        uploadHistory = uploadHistory.slice(0, 100);

      await chrome.storage.local.set({ uploadHistory });
    }
  }
});

// Handle keyboard shortcut (Ctrl+Shift+R / Cmd+Shift+R)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "quick-upload") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const result = await chrome.storage.local.get([
      "resumes",
      "selectedResumeId",
      "settings",
    ]);
    const resume = result.resumes?.find(
      (r) => r.id === result.selectedResumeId
    );

    if (resume && tab) {
      await chrome.tabs.sendMessage(tab.id, {
        action: "uploadResume",
        resume: resume,
        showNotifications: result.settings?.notifications !== false,
      });

      // Track upload
      const upload = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
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

      let uploadHistory = result.uploadHistory || [];
      uploadHistory.unshift(upload);
      if (uploadHistory.length > 100)
        uploadHistory = uploadHistory.slice(0, 100);

      await chrome.storage.local.set({ uploadHistory });
    }
  }
});
