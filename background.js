// Background service worker
// Handles extension initialization and context menu

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Resume Upload Manager extension installed");

  // Initialize storage
  const result = await chrome.storage.local.get(["resumes"]);
  if (!result.resumes) {
    await chrome.storage.local.set({
      resumes: [],
      selectedResumeId: null,
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
    ]);
    const resume = result.resumes?.find(
      (r) => r.id === result.selectedResumeId
    );

    if (resume) {
      await chrome.tabs.sendMessage(tab.id, {
        action: "uploadResume",
        resume: resume,
      });
    } else {
      // Show notification that no resume is selected
      chrome.action.openPopup();
    }
  }
});

// Handle keyboard shortcut (optional - can be added to manifest later)
chrome.commands?.onCommand.addListener(async (command) => {
  if (command === "quick-upload") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const result = await chrome.storage.local.get([
      "resumes",
      "selectedResumeId",
    ]);
    const resume = result.resumes?.find(
      (r) => r.id === result.selectedResumeId
    );

    if (resume) {
      await chrome.tabs.sendMessage(tab.id, {
        action: "uploadResume",
        resume: resume,
      });
    }
  }
});
