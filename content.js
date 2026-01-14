// Content script - runs on all web pages
// Detects file upload inputs and adds quick upload button

let uploadButton = null;
let fileInputs = [];

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  detectFileInputs();
  
  // Watch for dynamically added file inputs with more aggressive detection
  const observer = new MutationObserver(() => {
    detectFileInputs();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['type']
  });
  
  // Also check periodically for dynamically created inputs (like in Google Forms)
  setInterval(detectFileInputs, 2000);
}

function detectFileInputs() {
  // More comprehensive file input detection
  const inputs = [
    ...document.querySelectorAll('input[type="file"]'),
    // Also check for inputs that might become file inputs
    ...document.querySelectorAll('input[role="button"]'),
    // Check for custom file upload components
    ...document.querySelectorAll('[aria-label*="file"], [aria-label*="upload"], [aria-label*="attach"]')
  ];
  
  // Filter for actual file inputs or file upload triggers
  const fileInputElements = inputs.filter(el => {
    if (el.type === 'file') return true;
    
    // Check if element is part of a file upload component
    const parent = el.closest('[role="button"], button, .file-upload, [class*="upload"]');
    if (parent) {
      const fileInput = parent.querySelector('input[type="file"]');
      if (fileInput) return true;
    }
    
    return false;
  });
  
  if (fileInputElements.length > 0 && !uploadButton) {
    fileInputs = fileInputElements;
    
    // Check if any accept PDF files or have no restrictions
    const acceptsPDF = fileInputElements.some(input => {
      if (input.type !== 'file') {
        // For custom components, find the actual input
        const actualInput = input.closest('[role="button"], button, .file-upload, [class*="upload"]')
          ?.querySelector('input[type="file"]');
        if (actualInput) input = actualInput;
      }
      
      const accept = input.getAttribute('accept');
      const ariaLabel = input.getAttribute('aria-label')?.toLowerCase() || '';
      
      return !accept || 
             accept.includes('.pdf') || 
             accept.includes('application/pdf') || 
             accept === '*' ||
             ariaLabel.includes('resume') ||
             ariaLabel.includes('cv') ||
             ariaLabel.includes('document');
    });
    
    if (acceptsPDF) {
      addQuickUploadButton();
    }
  } else if (fileInputElements.length === 0 && uploadButton) {
    uploadButton.remove();
    uploadButton = null;
  }
}

function addQuickUploadButton() {
  if (uploadButton) return; // Already exists
  
  uploadButton = document.createElement('div');
  uploadButton.id = 'resume-pilot-button';
  uploadButton.innerHTML = `
    <button id="resume-pilot-upload-btn" style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      border: 1px solid rgba(255, 255, 255, 0.1);
    " onmouseover="this.style.background='#1d4ed8'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(37, 99, 235, 0.5)'" 
       onmouseout="this.style.background='#2563eb'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(37, 99, 235, 0.4)'">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      Upload Resume
    </button>
  `;
  
function addQuickUploadButton() {
  if (uploadButton) return; // Already exists
  
  uploadButton = document.createElement('div');
  uploadButton.id = 'resume-pilot-button';
  uploadButton.innerHTML = `
    <button id="resume-pilot-upload-btn" style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #ff5757;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(255, 87, 87, 0.4);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      border: 1px solid rgba(255, 255, 255, 0.1);
    " onmouseover="this.style.background='#e64545'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(255, 87, 87, 0.5)'" 
       onmouseout="this.style.background='#ff5757'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(255, 87, 87, 0.4)'">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      Upload Resume
    </button>
  `;
  
  uploadButton.querySelector('button').addEventListener('click', async () => {
    try {
      const result = await chrome.storage.local.get(['resumes', 'selectedResumeId', 'settings']);
      const resumes = result.resumes || [];
      const selectedId = result.selectedResumeId;
      const resume = resumes.find(r => r.id === selectedId);
      
      if (!resume) {
        showNotification('No resume selected. Click the extension icon to upload one.', 'error');
        return;
      }
      
      // Track upload
      const upload = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        resumeId: resume.id,
        resumeName: resume.displayName || resume.name,
        site: window.location.hostname,
        url: window.location.href,
        timestamp: Date.now(),
        company: '',
        position: '',
        status: 'applied',
        reminder: null
      };
      
      chrome.storage.local.get(['uploadHistory'], (res) => {
        let history = res.uploadHistory || [];
        history.unshift(upload);
        if (history.length > 100) history = history.slice(0, 100);
        chrome.storage.local.set({ uploadHistory: history });
      });
      
      uploadResumeToInputs(resume, result.settings?.notifications !== false);
    } catch (error) {
      showNotification('Error: ' + error.message, 'error');
    }
  });
  
  document.body.appendChild(uploadButton);
}

function uploadResumeToInputs(resume, showNotifications = true) {

function uploadResumeToInputs(resume, showNotifications = true) {
  // Find all file inputs including hidden ones and those in shadow DOM
  const fileInputs = getAllFileInputs();
  
  if (fileInputs.length === 0) {
    if (showNotifications) {
      showNotification('No file upload fields found on this page', 'error');
    }
    return;
  }
  
  // Smart filtering: Only upload to inputs that are likely for resumes/documents
  const resumeInputs = fileInputs.filter(input => isResumeInput(input));
  
  if (resumeInputs.length === 0) {
    // Fallback: if no smart matches, use all PDF-accepting inputs
    const pdfInputs = fileInputs.filter(input => {
      const accept = input.getAttribute('accept');
      return !accept || accept.includes('.pdf') || accept.includes('application/pdf') || accept === '*';
    });
    
    if (pdfInputs.length === 0) {
      if (showNotifications) {
        showNotification('No resume upload fields found', 'error');
      }
      return;
    }
    
    uploadToInputs(pdfInputs, resume, showNotifications);
  } else {
    uploadToInputs(resumeInputs, resume, showNotifications);
  }
}

// Smart detection: Check if input is likely for resume/CV
function isResumeInput(input) {
  const accept = input.getAttribute('accept');
  
  // Must accept PDFs or all files
  if (accept && !accept.includes('.pdf') && !accept.includes('application/pdf') && accept !== '*') {
    return false;
  }
  
  // Get all text context around the input
  const context = getInputContext(input).toLowerCase();
  
  // Resume/CV keywords (strong indicators)
  const resumeKeywords = [
    'resume', 'cv', 'curriculum', 'vitae',
    'cover letter', 'application', 'document',
    'qualification', 'portfolio', 'attach your'
  ];
  
  // Exclude keywords (NOT resume inputs)
  const excludeKeywords = [
    'photo', 'image', 'picture', 'avatar', 'profile pic',
    'logo', 'banner', 'screenshot', 'attachment',
    'invoice', 'receipt', 'passport', 'id card',
    'certificate', 'transcript', 'diploma'
  ];
  
  // Check for exclusions first
  if (excludeKeywords.some(keyword => context.includes(keyword))) {
    return false;
  }
  
  // Check for resume keywords
  if (resumeKeywords.some(keyword => context.includes(keyword))) {
    return true;
  }
  
  // Check for job board specific patterns
  if (isJobBoardSite() && accept && (accept.includes('.pdf') || accept.includes('application/pdf'))) {
    return true;
  }
  
  // If only one file input on page and it accepts PDFs, likely for resume
  const allInputs = getAllFileInputs();
  if (allInputs.length === 1 && (!accept || accept.includes('.pdf') || accept === '*')) {
    return true;
  }
  
  return false;
}

// Get text context around input (labels, placeholders, aria, nearby text)
function getInputContext(input) {
  let context = '';
  
  // Input attributes
  context += ' ' + (input.name || '');
  context += ' ' + (input.id || '');
  context += ' ' + (input.placeholder || '');
  context += ' ' + (input.getAttribute('aria-label') || '');
  context += ' ' + (input.title || '');
  context += ' ' + (input.className || '');
  
  // Associated label
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) context += ' ' + label.textContent;
  }
  
  // Parent label
  const parentLabel = input.closest('label');
  if (parentLabel) context += ' ' + parentLabel.textContent;
  
  // Nearby text (within 100px)
  const rect = input.getBoundingClientRect();
  const nearbyElements = document.querySelectorAll('label, span, div, p, h1, h2, h3, h4, h5, h6');
  nearbyElements.forEach(el => {
    const elRect = el.getBoundingClientRect();
    const distance = Math.sqrt(
      Math.pow(rect.left - elRect.left, 2) + 
      Math.pow(rect.top - elRect.top, 2)
    );
    if (distance < 100) {
      context += ' ' + el.textContent;
    }
  });
  
  // Parent containers text
  let parent = input.parentElement;
  let levels = 0;
  while (parent && levels < 3) {
    const directText = Array.from(parent.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent)
      .join(' ');
    context += ' ' + directText;
    parent = parent.parentElement;
    levels++;
  }
  
  return context;
}

// Check if we're on a known job board
function isJobBoardSite() {
  const jobBoards = [
    'linkedin.com', 'indeed.com', 'glassdoor.com',
    'monster.com', 'ziprecruiter.com', 'careerbuilder.com',
    'naukri.com', 'shine.com', 'instahyre.com',
    'wellfound.com', 'angel.co', 'greenhouse.io',
    'lever.co', 'workday.com', 'smartrecruiters.com',
    'taleo.net', 'icims.com', 'jobvite.com'
  ];
  
  return jobBoards.some(board => window.location.hostname.includes(board));
}

function uploadToInputs(inputs, resume, showNotifications) {
  // Convert base64 back to File object
  const base64Data = resume.data.split(',')[1];
  const binaryData = atob(base64Data);
  const bytes = new Uint8Array(binaryData.length);
  
  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i);
  }
  
  const blob = new Blob([bytes], { type: resume.type });
  const file = new File([blob], resume.name, { 
    type: resume.type,
    lastModified: Date.now()
  });
  
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  
  let uploadedCount = 0;
  
  inputs.forEach(input => {
    try {
      // Set files
      input.files = dataTransfer.files;
      
      // Trigger all possible events that forms might listen to
      const events = ['input', 'change', 'blur'];
      events.forEach(eventType => {
        input.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      
      // For Google Forms and similar, also trigger click on parent button
      const parentButton = input.closest('button, [role="button"]');
      if (parentButton) {
        parentButton.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Try to trigger React/Vue events
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'files'
      )?.set;
      
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, dataTransfer.files);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      uploadedCount++;
      
      // Visual feedback - highlight the input area
      highlightInput(input);
    } catch (e) {
      console.log('Could not upload to input:', e);
    }
  });
  
  if (showNotifications) {
    if (uploadedCount > 0) {
      showNotification(
        `Resume uploaded to ${uploadedCount} field${uploadedCount > 1 ? 's' : ''}`,
        'success'
      );
    } else {
      showNotification('No compatible file upload fields found', 'error');
    }
  }
}

function getAllFileInputs() {
  const inputs = [];
  
  // Get all file inputs in main document
  inputs.push(...document.querySelectorAll('input[type="file"]'));
  
  // Get inputs in iframes (if accessible)
  document.querySelectorAll('iframe').forEach(iframe => {
    try {
      const iframeInputs = iframe.contentDocument?.querySelectorAll('input[type="file"]');
      if (iframeInputs) inputs.push(...iframeInputs);
    } catch (e) {
      // Cross-origin iframe, skip
    }
  });
  
  // Get inputs in shadow DOM
  document.querySelectorAll('*').forEach(el => {
    if (el.shadowRoot) {
      inputs.push(...el.shadowRoot.querySelectorAll('input[type="file"]'));
    }
  });
  
  return inputs;
}

function highlightInput(input) {
  // Find the visible parent element to highlight
  let targetElement = input;
  
  // If input is hidden, try to find its visible parent
  if (input.offsetParent === null || window.getComputedStyle(input).display === 'none') {
    targetElement = input.closest('button, [role="button"], .file-upload, [class*="upload"], label, div');
  }
  
  if (targetElement) {
    const originalBorder = targetElement.style.border;
    const originalOutline = targetElement.style.outline;
    
    targetElement.style.outline = '2px solid #10b981';
    targetElement.style.outlineOffset = '2px';
    
    setTimeout(() => {
      targetElement.style.border = originalBorder;
      targetElement.style.outline = originalOutline;
    }, 1500);
  }
}

function showNotification(message, type = 'success') {
  // Remove existing notification if any
  const existing = document.getElementById('resume-pilot-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.id = 'resume-pilot-notification';
  
  const icon = type === 'success' 
    ? '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    : '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 24px;
      right: 24px;
      background: ${type === 'error' ? '#dc2626' : '#10b981'};
      color: white;
      padding: 14px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      z-index: 1000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 320px;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideInRight 0.3s ease-out;
    ">
      ${icon}
      <span>${message}</span>
    </div>
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  
  if (!document.getElementById('resume-pilot-styles')) {
    style.id = 'resume-pilot-styles';
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3500);
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'uploadResume') {
    uploadResumeToInputs(request.resume, request.showNotifications);
    sendResponse({ success: true });
  }
  return true;
});