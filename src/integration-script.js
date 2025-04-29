/**
 * Terrific Timeline Integration Script
 * This script handles the communication between your website and the Terrific Timeline iframes
 */

(function() {
  // Store original iframe styles for restoration
  let originalStyles = {};
  const IFRAME_ID = 'terrific-timeline-iframe';

  /**
   * Initialize the timeline integration
   */
  function initTimelineIntegration() {
    setupMessageListeners();
    sendCurrentPageUrl();
    processUrlParameters();
  }

  /**
   * Set up all message event listeners
   */
  function setupMessageListeners() {
    window.addEventListener('message', handleIncomingMessages);
  }

  /**
   * Handle all incoming postMessage events
   * @param {MessageEvent} event - The message event
   */
  function handleIncomingMessages(event) {
    // Validate event origin for security (add your domain check here)
    // if (event.origin !== 'https://your-trusted-domain.com') return;

    const data = event.data;

    // Handle different message types
    if (data === 'LAUNCH_FSR_IFRAME') {
      expandIframeToFullscreen();
    } else if (data === 'CLOSE_FSR_IFRAME') {
      restoreIframeOriginalSize();
    } else if (data && data.type === 'SHARE_URL') {
        console.log('SHARE_URL', data.url);
      handleShareUrl(data.url);
    }
  }

  /**
   * Expand the iframe to fullscreen
   */
  function expandIframeToFullscreen() {
    const iframe = document.getElementById(IFRAME_ID);
    if (!iframe) return;

    // Save original styles
    originalStyles = {
      width: iframe.style.width,
      height: iframe.style.height,
      position: iframe.style.position,
      top: iframe.style.top,
      left: iframe.style.left,
      zIndex: iframe.style.zIndex,
      border: iframe.style.border
    };

    // Apply fullscreen styles
    iframe.style.width = "100vw";
    iframe.style.height = "100vh";
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.zIndex = "9999";
    iframe.style.border = "none";
  }

  /**
   * Restore the iframe to its original size
   */
  function restoreIframeOriginalSize() {
    const iframe = document.getElementById(IFRAME_ID);
    if (!iframe) return;

    // Restore original styles
    Object.keys(originalStyles).forEach(key => {
      iframe.style[key] = originalStyles[key];
    });
  }

  /**
   * Handle sharing URL functionality
   * @param {string} shareUrl - The URL to share
   */
  function handleShareUrl(shareUrl) {
    if (!shareUrl) return;

    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        // Success - you could show a notification here
      })
      .catch(err => {
        console.error('Failed to copy URL: ', err);
        // Fallback for browsers that don't support clipboard API
        promptUserToCopy(shareUrl);
      });
  }

  /**
   * Fallback method for copying to clipboard
   * @param {string} text - The text to copy
   */
  function promptUserToCopy(text) {
    prompt('Copy this URL:', text);
  }

  /**
   * Send the current page URL to the iframe
   */
  function sendCurrentPageUrl() {
    window.addEventListener('load', function() {
      const iframe = document.getElementById(IFRAME_ID);
      if (!iframe) return;

      iframe.contentWindow.postMessage({
        type: 'CURRENT_PAGE_URL',
        url: window.location.href
      }, '*');
    });
  }

  /**
   * Process URL parameters and send them to the iframe
   */
  function processUrlParameters() {
    console.log('processUrlParameters');
    window.addEventListener('load', function() {
      const iframe = document.getElementById(IFRAME_ID);
      if (!iframe) return;

      const urlObj = new URL(window.location.href);
      const startTime = urlObj.searchParams.get('start-time');

      // Only send message if we have parameters to send
      if (startTime) {
        iframe.onload = function() {
          iframe.contentWindow.postMessage({
            type: 'URL_PARAMETERS',
            startTime: startTime,
            referer: window.location.href
          }, '*');
        };
      }
    });
  }

  // Initialize the script
  initTimelineIntegration();
})(); 