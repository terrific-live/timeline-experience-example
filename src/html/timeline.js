"use strict";
(() => {
    let originalStyles = {};
    let displayIframe = null;
    let isDisplayOpen = false;
    let lastUrlSentTime = 0;
    const URL_SEND_INTERVAL = 5000;
    const LAUNCHR_ID = 'terrific-timeline-iframe';
    const DISPLAY_IFRAME_ID = 'display-iframe';
    const OVERLAY_ID = 'timeline-overlay';
    let isCustomCssApplied = false;
    /**
     * Create CSS styles for the terrific-display-open class
     */
    function createAccessibilityDisplayStyles() {
        // Check if styles already exist
        if (document.getElementById('terrific-accessibility-styles')) {
            return;
        }
        const style = document.createElement('style');
        style.id = 'terrific-accessibility-styles';
        style.textContent = `
      .terrific-display-open {
        bottom: 4% !important;
        top: auto !important;
      }
    `;
        document.head.appendChild(style);
    }
    /**
     * Initialize the timeline integration
     */
    function initTimelineIntegration() {
        createAccessibilityDisplayStyles();
        setupMessageListeners();
        setupPageLoadEvents();
    }
    /**
     * Set up all message event listeners
     */
    function setupMessageListeners() {
        window.addEventListener('message', handleIncomingMessages);
    }
    /**
     * Handle all incoming postMessage events
     */
    function handleIncomingMessages(e) {
        if (e.data === 'CLOSE_FSR_IFRAME' ||
            e.data === 'DISPLAY_INSTANCE_CLOSED' ||
            e.data === 'GLOBAL_CLOSE_ALL_DISPLAYS') {
            restoreIframeOriginalSize();
        }
        else if (e.data && e.data.type === 'SHARE_URL') {
            handleShareUrl(e.data.url);
        }
        else if (e.data && e.data.type === 'OPEN_DISPLAY') {
            // Force close any existing display first to ensure clean state
            if (isDisplayOpen || displayIframe) {
                restoreIframeOriginalSize();
                // Small delay to ensure cleanup is complete
                setTimeout(() => {
                    openDisplayIframe(e.data);
                }, 100);
            }
            else {
                openDisplayIframe(e.data);
            }
        }
        else if (e.data &&
            e.data.type === 'CUSTOM_TIMELINE_SDK_CSS' &&
            e.data.sdkCss &&
            !isCustomCssApplied) {
            const styleElementClient = document.createElement('style');
            styleElementClient.textContent = e.data.sdkCss;
            document.head.appendChild(styleElementClient);
            isCustomCssApplied = true;
        }
    }
    /**
     * Set up events that should happen on page load
     */
    function setupPageLoadEvents() {
        window.addEventListener('load', function () {
            // Check for start-time parameter immediately on page load
            checkForStartTimeAndOpenDisplay();
            sendCurrentPageUrl();
            setTimeout(() => {
                if (!isDisplayOpen) {
                    sendCurrentPageUrl();
                }
            }, 1000);
        });
    }
    /**
     * Check if current URL has start-time parameter and open display immediately
     */
    function checkForStartTimeAndOpenDisplay() {
        try {
            const currentUrl = new URL(window.location.href);
            const startTimeParam = currentUrl.searchParams.get('start-time');
            const langParam = currentUrl.searchParams.get('lang');
            if (startTimeParam && !isDisplayOpen) {
                const carousel = document.getElementById(LAUNCHR_ID);
                if (carousel && carousel.src) {
                    const carouselSrc = new URL(carousel.src);
                    const timelineId = carouselSrc.searchParams.get('id');
                    if (timelineId) {
                        // Create the display data object
                        const displayData = {
                            type: 'OPEN_DISPLAY',
                            params: {
                                id: timelineId,
                                startTime: startTimeParam,
                                originalUrl: window.location.href,
                                lang: langParam !== null && langParam !== void 0 ? langParam : '',
                            },
                        };
                        // Open display immediately
                        openDisplayIframe(displayData);
                    }
                }
            }
        }
        catch (error) {
            console.error('[DEBUG SDK] Error checking for start-time parameter:', error);
        }
    }
    /**
     * Send the current page URL to the iframe
     */
    function sendCurrentPageUrl() {
        const now = Date.now();
        if (now - lastUrlSentTime < URL_SEND_INTERVAL || isDisplayOpen) {
            return;
        }
        const iframe = document.getElementById(LAUNCHR_ID);
        if (iframe && iframe.contentWindow) {
            // Check for start-time when carousel is ready (fallback if not caught on page load)
            if (!isDisplayOpen) {
                checkForStartTimeAndOpenDisplay();
            }
            iframe.contentWindow.postMessage({
                type: 'CURRENT_PAGE_URL',
                url: window.location.href,
            }, '*');
            lastUrlSentTime = now;
        }
    }
    /**
     * Create and show an overlay element
     */
    function createOverlay() {
        if (document.getElementById(OVERLAY_ID)) {
            return;
        }
        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.3)';
        overlay.style.zIndex = '7999';
        document.body.appendChild(overlay);
    }
    /**
     * Save original styles of the carousel
     */
    function saveOriginalStyles() {
        const carousel = document.getElementById(LAUNCHR_ID);
        originalStyles = {
            width: carousel === null || carousel === void 0 ? void 0 : carousel.style.width,
            height: carousel === null || carousel === void 0 ? void 0 : carousel.style.height,
            position: carousel === null || carousel === void 0 ? void 0 : carousel.style.position,
            top: carousel === null || carousel === void 0 ? void 0 : carousel.style.top,
            left: carousel === null || carousel === void 0 ? void 0 : carousel.style.left,
            zIndex: carousel === null || carousel === void 0 ? void 0 : carousel.style.zIndex,
            border: carousel === null || carousel === void 0 ? void 0 : carousel.style.border,
            filter: carousel === null || carousel === void 0 ? void 0 : carousel.style.filter,
        };
    }
    /**
     * Ensure original-url parameter is set for sharing functionality
     */
    function ensureOriginalUrlParam(displayUrl, params) {
        if (!displayUrl.searchParams.has('original-url') && (!params || !params.originalUrl)) {
            displayUrl.searchParams.set('original-url', encodeURIComponent(window.location.href));
        }
    }
    /**
     * Check if the current device is mobile
     */
    function isMobileDevice() {
        return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            window.innerWidth <= 768);
    }
    /**
     * Open display iframe with the given parameters
     * Handles both legacy and new parameter formats
     */
    function openDisplayIframe(data) {
        if (isDisplayOpen || displayIframe) {
            return;
        }
        isDisplayOpen = true;
        const carousel = document.getElementById(LAUNCHR_ID);
        createOverlay();
        saveOriginalStyles();
        const existingIframe = document.getElementById(DISPLAY_IFRAME_ID);
        if (existingIframe) {
            document.body.removeChild(existingIframe);
        }
        displayIframe = document.createElement('iframe');
        displayIframe.id = DISPLAY_IFRAME_ID;
        displayIframe.style.position = 'fixed';
        displayIframe.style.top = '0';
        displayIframe.style.left = '0';
        displayIframe.style.width = '100%';
        displayIframe.style.height = '100%';
        displayIframe.style.border = 'none';
        displayIframe.style.zIndex = '8000';
        displayIframe.setAttribute('allow', 'autoplay');
        // Check if mobile device and adjust iframe properties accordingly
        if (isMobileDevice()) {
            // Add class to accessibility div for mobile display state
            const accessibilityDiv = document.getElementById('accessibility');
            if (accessibilityDiv) {
                accessibilityDiv.classList.add('terrific-display-open');
            }
        }
        const carouselSrc = new URL(carousel.src);
        const timelineId = carouselSrc.searchParams.get('id');
        const displayUrl = new URL('/timeline/display', carouselSrc.origin);
        // Handle both legacy format (data.displayParams) and new format (data.params or direct data)
        let params = data;
        if (data && data.displayParams) {
            params = data.displayParams;
        }
        else if (data && data.params) {
            params = data.params;
        }
        // Set URL parameters
        if (params && typeof params === 'object') {
            if (params.id)
                displayUrl.searchParams.set('id', params.id);
            if (params.startTime) {
                displayUrl.searchParams.set('start-time', params.startTime);
            }
            if (params.originalUrl)
                displayUrl.searchParams.set('original-url', params.originalUrl);
            if (params.lang)
                displayUrl.searchParams.set('lang', params.lang);
        }
        // Fallback: use timeline ID from carousel if no ID provided
        if (!displayUrl.searchParams.has('id') && timelineId) {
            displayUrl.searchParams.set('id', timelineId);
        }
        // Always include the current page URL for sharing functionality
        ensureOriginalUrlParam(displayUrl, params);
        const finalUrl = displayUrl.toString();
        displayIframe.src = finalUrl;
        document.body.appendChild(displayIframe);
    }
    /**
     * Close the fullscreen iframe
     */
    function restoreIframeOriginalSize() {
        if (!isDisplayOpen && !displayIframe) {
            return;
        }
        if (displayIframe) {
            displayIframe.style.display = 'none';
            setTimeout(() => {
                if (displayIframe) {
                    document.body.removeChild(displayIframe);
                    displayIframe = null;
                }
            }, 100); // Reduced timeout for faster cleanup
        }
        if (isMobileDevice()) {
            // Remove class from accessibility div for mobile
            const accessibilityDiv = document.getElementById('accessibility');
            if (accessibilityDiv) {
                accessibilityDiv.classList.remove('terrific-display-open');
            }
        }
        const overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
            document.body.removeChild(overlay);
        }
        const carousel = document.getElementById(LAUNCHR_ID);
        if (carousel && originalStyles) {
            carousel.style.filter =
                originalStyles.filter || 'none';
        }
        isDisplayOpen = false;
        lastUrlSentTime = Date.now();
    }
    /**
     * Handle sharing URL functionality
     */
    function handleShareUrl(shareUrl) {
        navigator.clipboard
            .writeText(shareUrl)
            .then(() => {
            // URL copied successfully
        })
            .catch((err) => {
            console.error('Failed to copy URL: ', err);
            prompt('Copy this URL:', shareUrl);
        });
    }
    // Initialize the timeline integration
    initTimelineIntegration();
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdGVycmlmaWMtZW1iZWQtc2RrL3RpbWVsaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxDQUFDLEdBQUcsRUFBRTtJQUNKLElBQUksY0FBYyxHQUFHLEVBQUUsQ0FBQztJQUN4QixJQUFJLGFBQWEsR0FBNkIsSUFBSSxDQUFDO0lBQ25ELElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztJQUMxQixJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUM7SUFDeEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUM7SUFDL0IsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUM7SUFDOUMsTUFBTSxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQztJQUMzQyxNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQztJQUN0QyxJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQztJQUUvQjs7T0FFRztJQUNILFNBQVMsZ0NBQWdDO1FBQ3ZDLGdDQUFnQztRQUNoQyxJQUFJLFFBQVEsQ0FBQyxjQUFjLENBQUMsK0JBQStCLENBQUMsRUFBRSxDQUFDO1lBQzdELE9BQU87UUFDVCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM5QyxLQUFLLENBQUMsRUFBRSxHQUFHLCtCQUErQixDQUFDO1FBQzNDLEtBQUssQ0FBQyxXQUFXLEdBQUc7Ozs7O0tBS25CLENBQUM7UUFDRixRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLHVCQUF1QjtRQUM5QixnQ0FBZ0MsRUFBRSxDQUFDO1FBQ25DLHFCQUFxQixFQUFFLENBQUM7UUFDeEIsbUJBQW1CLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTLHFCQUFxQjtRQUM1QixNQUFNLENB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IG9yaWdpbmFsU3R5bGVzID0ge307XG4gIGxldCBkaXNwbGF5SWZyYW1lOiBIVE1MSUZyYW1lRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBsZXQgaXNEaXNwbGF5T3BlbiA9IGZhbHNlO1xuICBsZXQgbGFzdFVybFNlbnRUaW1lID0gMDtcbiAgY29uc3QgVVJMX1NFTkRfSU5URVJWQUwgPSA1MDAwO1xuICBjb25zdCBMQVVOQ0hSX0lEID0gJ3RlcnJpZmljLXRpbWVsaW5lLWlmcmFtZSc7XG4gIGNvbnN0IERJU1BMQVlfSUZSQU1FX0lEID0gJ2Rpc3BsYXktaWZyYW1lJztcbiAgY29uc3QgT1ZFUkxBWV9JRCA9ICd0aW1lbGluZS1vdmVybGF5JztcbiAgbGV0IGlzQ3VzdG9tQ3NzQXBwbGllZCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgQ1NTIHN0eWxlcyBmb3IgdGhlIHRlcnJpZmljLWRpc3BsYXktb3BlbiBjbGFzc1xuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQWNjZXNzaWJpbGl0eURpc3BsYXlTdHlsZXMoKSB7XG4gICAgLy8gQ2hlY2sgaWYgc3R5bGVzIGFscmVhZHkgZXhpc3RcbiAgICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3RlcnJpZmljLWFjY2Vzc2liaWxpdHktc3R5bGVzJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgc3R5bGUuaWQgPSAndGVycmlmaWMtYWNjZXNzaWJpbGl0eS1zdHlsZXMnO1xuICAgIHN0eWxlLnRleHRDb250ZW50ID0gYFxuICAgICAgLnRlcnJpZmljLWRpc3BsYXktb3BlbiB7XG4gICAgICAgIGJvdHRvbTogNCUgIWltcG9ydGFudDtcbiAgICAgICAgdG9wOiBhdXRvICFpbXBvcnRhbnQ7XG4gICAgICB9XG4gICAgYDtcbiAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRoZSB0aW1lbGluZSBpbnRlZ3JhdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdFRpbWVsaW5lSW50ZWdyYXRpb24oKSB7XG4gICAgY3JlYXRlQWNjZXNzaWJpbGl0eURpc3BsYXlTdHlsZXMoKTtcbiAgICBzZXR1cE1lc3NhZ2VMaXN0ZW5lcnMoKTtcbiAgICBzZXR1cFBhZ2VMb2FkRXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHVwIGFsbCBtZXNzYWdlIGV2ZW50IGxpc3RlbmVyc1xuICAgKi9cbiAgZnVuY3Rpb24gc2V0dXBNZXNzYWdlTGlzdGVuZXJzKCkge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgaGFuZGxlSW5jb21pbmdNZXNzYWdlcyk7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlIGFsbCBpbmNvbWluZyBwb3N0TWVzc2FnZSBldmVudHNcbiAgICovXG4gIGZ1bmN0aW9uIGhhbmRsZUluY29taW5nTWVzc2FnZXMoZTogTWVzc2FnZUV2ZW50KSB7XG4gICAgaWYgKFxuICAgICAgZS5kYXRhID09PSAnQ0xPU0VfRlNSX0lGUkFNRScgfHxcbiAgICAgIGUuZGF0YSA9PT0gJ0RJU1BMQVlfSU5TVEFOQ0VfQ0xPU0VEJyB8fFxuICAgICAgZS5kYXRhID09PSAnR0xPQkFMX0NMT1NFX0FMTF9ESVNQTEFZUydcbiAgICApIHtcbiAgICAgIHJlc3RvcmVJZnJhbWVPcmlnaW5hbFNpemUoKTtcbiAgICB9IGVsc2UgaWYgKGUuZGF0YSAmJiBlLmRhdGEudHlwZSA9PT0gJ1NIQVJFX1VSTCcpIHtcbiAgICAgIGhhbmRsZVNoYXJlVXJsKGUuZGF0YS51cmwpO1xuICAgIH0gZWxzZSBpZiAoZS5kYXRhICYmIGUuZGF0YS50eXBlID09PSAnT1BFTl9ESVNQTEFZJykge1xuICAgICAgLy8gRm9yY2UgY2xvc2UgYW55IGV4aXN0aW5nIGRpc3BsYXkgZmlyc3QgdG8gZW5zdXJlIGNsZWFuIHN0YXRlXG4gICAgICBpZiAoaXNEaXNwbGF5T3BlbiB8fCBkaXNwbGF5SWZyYW1lKSB7XG4gICAgICAgIHJlc3RvcmVJZnJhbWVPcmlnaW5hbFNpemUoKTtcbiAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIGNsZWFudXAgaXMgY29tcGxldGVcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgb3BlbkRpc3BsYXlJZnJhbWUoZS5kYXRhKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9wZW5EaXNwbGF5SWZyYW1lKGUuZGF0YSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGUuZGF0YSAmJlxuICAgICAgZS5kYXRhLnR5cGUgPT09ICdDVVNUT01fVElNRUxJTkVfU0RLX0NTUycgJiZcbiAgICAgIGUuZGF0YS5zZGtDc3MgJiZcbiAgICAgICFpc0N1c3RvbUNzc0FwcGxpZWRcbiAgICApIHtcbiAgICAgIGNvbnN0IHN0eWxlRWxlbWVudENsaWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgICBzdHlsZUVsZW1lbnRDbGllbnQudGV4dENvbnRlbnQgPSBlLmRhdGEuc2RrQ3NzO1xuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZUVsZW1lbnRDbGllbnQpO1xuICAgICAgaXNDdXN0b21Dc3NBcHBsaWVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IHVwIGV2ZW50cyB0aGF0IHNob3VsZCBoYXBwZW4gb24gcGFnZSBsb2FkXG4gICAqL1xuICBmdW5jdGlvbiBzZXR1cFBhZ2VMb2FkRXZlbnRzKCkge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gQ2hlY2sgZm9yIHN0YXJ0LXRpbWUgcGFyYW1ldGVyIGltbWVkaWF0ZWx5IG9uIHBhZ2UgbG9hZFxuICAgICAgY2hlY2tGb3JTdGFydFRpbWVBbmRPcGVuRGlzcGxheSgpO1xuXG4gICAgICBzZW5kQ3VycmVudFBhZ2VVcmwoKTtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoIWlzRGlzcGxheU9wZW4pIHtcbiAgICAgICAgICBzZW5kQ3VycmVudFBhZ2VVcmwoKTtcbiAgICAgICAgfVxuICAgICAgfSwgMTAwMCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgY3VycmVudCBVUkwgaGFzIHN0YXJ0LXRpbWUgcGFyYW1ldGVyIGFuZCBvcGVuIGRpc3BsYXkgaW1tZWRpYXRlbHlcbiAgICovXG4gIGZ1bmN0aW9uIGNoZWNrRm9yU3RhcnRUaW1lQW5kT3BlbkRpc3BsYXkoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGN1cnJlbnRVcmwgPSBuZXcgVVJMKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICAgIGNvbnN0IHN0YXJ0VGltZVBhcmFtID0gY3VycmVudFVybC5zZWFyY2hQYXJhbXMuZ2V0KCdzdGFydC10aW1lJyk7XG4gICAgICBjb25zdCBsYW5nUGFyYW0gPSBjdXJyZW50VXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2xhbmcnKTtcbiAgICAgIGlmIChzdGFydFRpbWVQYXJhbSAmJiAhaXNEaXNwbGF5T3Blbikge1xuICAgICAgICBjb25zdCBjYXJvdXNlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKExBVU5DSFJfSUQpIGFzIEhUTUxJRnJhbWVFbGVtZW50O1xuICAgICAgICBpZiAoY2Fyb3VzZWwgJiYgY2Fyb3VzZWwuc3JjKSB7XG4gICAgICAgICAgY29uc3QgY2Fyb3VzZWxTcmMgPSBuZXcgVVJMKGNhcm91c2VsLnNyYyk7XG4gICAgICAgICAgY29uc3QgdGltZWxpbmVJZCA9IGNhcm91c2VsU3JjLnNlYXJjaFBhcmFtcy5nZXQoJ2lkJyk7XG5cbiAgICAgICAgICBpZiAodGltZWxpbmVJZCkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSBkaXNwbGF5IGRhdGEgb2JqZWN0XG4gICAgICAgICAgICBjb25zdCBkaXNwbGF5RGF0YSA9IHtcbiAgICAgICAgICAgICAgdHlwZTogJ09QRU5fRElTUExBWScsXG4gICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgIGlkOiB0aW1lbGluZUlkLFxuICAgICAgICAgICAgICAgIHN0YXJ0VGltZTogc3RhcnRUaW1lUGFyYW0sXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxVcmw6IHdpbmRvdy5sb2NhdGlvbi5ocmVmLFxuICAgICAgICAgICAgICAgIGxhbmc6IGxhbmdQYXJhbSA/PyAnJyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIE9wZW4gZGlzcGxheSBpbW1lZGlhdGVseVxuICAgICAgICAgICAgb3BlbkRpc3BsYXlJZnJhbWUoZGlzcGxheURhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbREVCVUcgU0RLXSBFcnJvciBjaGVja2luZyBmb3Igc3RhcnQtdGltZSBwYXJhbWV0ZXI6JywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZW5kIHRoZSBjdXJyZW50IHBhZ2UgVVJMIHRvIHRoZSBpZnJhbWVcbiAgICovXG4gIGZ1bmN0aW9uIHNlbmRDdXJyZW50UGFnZVVybCgpIHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIGlmIChub3cgLSBsYXN0VXJsU2VudFRpbWUgPCBVUkxfU0VORF9JTlRFUlZBTCB8fCBpc0Rpc3BsYXlPcGVuKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgaWZyYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoTEFVTkNIUl9JRCkgYXMgSFRNTElGcmFtZUVsZW1lbnQ7XG4gICAgaWYgKGlmcmFtZSAmJiBpZnJhbWUuY29udGVudFdpbmRvdykge1xuICAgICAgLy8gQ2hlY2sgZm9yIHN0YXJ0LXRpbWUgd2hlbiBjYXJvdXNlbCBpcyByZWFkeSAoZmFsbGJhY2sgaWYgbm90IGNhdWdodCBvbiBwYWdlIGxvYWQpXG4gICAgICBpZiAoIWlzRGlzcGxheU9wZW4pIHtcbiAgICAgICAgY2hlY2tGb3JTdGFydFRpbWVBbmRPcGVuRGlzcGxheSgpO1xuICAgICAgfVxuXG4gICAgICBpZnJhbWUuY29udGVudFdpbmRvdy5wb3N0TWVzc2FnZShcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6ICdDVVJSRU5UX1BBR0VfVVJMJyxcbiAgICAgICAgICB1cmw6IHdpbmRvdy5sb2NhdGlvbi5ocmVmLFxuICAgICAgICB9LFxuICAgICAgICAnKidcbiAgICAgICk7XG4gICAgICBsYXN0VXJsU2VudFRpbWUgPSBub3c7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbmQgc2hvdyBhbiBvdmVybGF5IGVsZW1lbnRcbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZU92ZXJsYXkoKSB7XG4gICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKE9WRVJMQVlfSUQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgb3ZlcmxheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIG92ZXJsYXkuaWQgPSBPVkVSTEFZX0lEO1xuICAgIG92ZXJsYXkuc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgIG92ZXJsYXkuc3R5bGUudG9wID0gJzAnO1xuICAgIG92ZXJsYXkuc3R5bGUubGVmdCA9ICcwJztcbiAgICBvdmVybGF5LnN0eWxlLndpZHRoID0gJzEwMHZ3JztcbiAgICBvdmVybGF5LnN0eWxlLmhlaWdodCA9ICcxMDB2aCc7XG4gICAgb3ZlcmxheS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgwLDAsMCwwLjMpJztcbiAgICBvdmVybGF5LnN0eWxlLnpJbmRleCA9ICc3OTk5JztcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG92ZXJsYXkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNhdmUgb3JpZ2luYWwgc3R5bGVzIG9mIHRoZSBjYXJvdXNlbFxuICAgKi9cbiAgZnVuY3Rpb24gc2F2ZU9yaWdpbmFsU3R5bGVzKCkge1xuICAgIGNvbnN0IGNhcm91c2VsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoTEFVTkNIUl9JRCk7XG4gICAgb3JpZ2luYWxTdHlsZXMgPSB7XG4gICAgICB3aWR0aDogY2Fyb3VzZWw/LnN0eWxlLndpZHRoLFxuICAgICAgaGVpZ2h0OiBjYXJvdXNlbD8uc3R5bGUuaGVpZ2h0LFxuICAgICAgcG9zaXRpb246IGNhcm91c2VsPy5zdHlsZS5wb3NpdGlvbixcbiAgICAgIHRvcDogY2Fyb3VzZWw/LnN0eWxlLnRvcCxcbiAgICAgIGxlZnQ6IGNhcm91c2VsPy5zdHlsZS5sZWZ0LFxuICAgICAgekluZGV4OiBjYXJvdXNlbD8uc3R5bGUuekluZGV4LFxuICAgICAgYm9yZGVyOiBjYXJvdXNlbD8uc3R5bGUuYm9yZGVyLFxuICAgICAgZmlsdGVyOiBjYXJvdXNlbD8uc3R5bGUuZmlsdGVyLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRW5zdXJlIG9yaWdpbmFsLXVybCBwYXJhbWV0ZXIgaXMgc2V0IGZvciBzaGFyaW5nIGZ1bmN0aW9uYWxpdHlcbiAgICovXG4gIGZ1bmN0aW9uIGVuc3VyZU9yaWdpbmFsVXJsUGFyYW0oZGlzcGxheVVybDogVVJMLCBwYXJhbXM/OiBhbnkpIHtcbiAgICBpZiAoIWRpc3BsYXlVcmwuc2VhcmNoUGFyYW1zLmhhcygnb3JpZ2luYWwtdXJsJykgJiYgKCFwYXJhbXMgfHwgIXBhcmFtcy5vcmlnaW5hbFVybCkpIHtcbiAgICAgIGRpc3BsYXlVcmwuc2VhcmNoUGFyYW1zLnNldCgnb3JpZ2luYWwtdXJsJywgZW5jb2RlVVJJQ29tcG9uZW50KHdpbmRvdy5sb2NhdGlvbi5ocmVmKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoZSBjdXJyZW50IGRldmljZSBpcyBtb2JpbGVcbiAgICovXG4gIGZ1bmN0aW9uIGlzTW9iaWxlRGV2aWNlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAoXG4gICAgICAvQW5kcm9pZHx3ZWJPU3xpUGhvbmV8aVBhZHxpUG9kfEJsYWNrQmVycnl8SUVNb2JpbGV8T3BlcmEgTWluaS9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkgfHxcbiAgICAgIHdpbmRvdy5pbm5lcldpZHRoIDw9IDc2OFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogT3BlbiBkaXNwbGF5IGlmcmFtZSB3aXRoIHRoZSBnaXZlbiBwYXJhbWV0ZXJzXG4gICAqIEhhbmRsZXMgYm90aCBsZWdhY3kgYW5kIG5ldyBwYXJhbWV0ZXIgZm9ybWF0c1xuICAgKi9cbiAgZnVuY3Rpb24gb3BlbkRpc3BsYXlJZnJhbWUoZGF0YTogYW55KSB7XG4gICAgaWYgKGlzRGlzcGxheU9wZW4gfHwgZGlzcGxheUlmcmFtZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlzRGlzcGxheU9wZW4gPSB0cnVlO1xuXG4gICAgY29uc3QgY2Fyb3VzZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChMQVVOQ0hSX0lEKTtcblxuICAgIGNyZWF0ZU92ZXJsYXkoKTtcbiAgICBzYXZlT3JpZ2luYWxTdHlsZXMoKTtcblxuICAgIGNvbnN0IGV4aXN0aW5nSWZyYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoRElTUExBWV9JRlJBTUVfSUQpO1xuICAgIGlmIChleGlzdGluZ0lmcmFtZSkge1xuICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChleGlzdGluZ0lmcmFtZSk7XG4gICAgfVxuXG4gICAgZGlzcGxheUlmcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgIGRpc3BsYXlJZnJhbWUuaWQgPSBESVNQTEFZX0lGUkFNRV9JRDtcbiAgICBkaXNwbGF5SWZyYW1lLnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgICBkaXNwbGF5SWZyYW1lLnN0eWxlLnRvcCA9ICcwJztcbiAgICBkaXNwbGF5SWZyYW1lLnN0eWxlLmxlZnQgPSAnMCc7XG4gICAgZGlzcGxheUlmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICBkaXNwbGF5SWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICBkaXNwbGF5SWZyYW1lLnN0eWxlLmJvcmRlciA9ICdub25lJztcbiAgICBkaXNwbGF5SWZyYW1lLnN0eWxlLnpJbmRleCA9ICc4MDAwJztcbiAgICBkaXNwbGF5SWZyYW1lLnNldEF0dHJpYnV0ZSgnYWxsb3cnLCAnYXV0b3BsYXknKTtcblxuICAgIC8vIENoZWNrIGlmIG1vYmlsZSBkZXZpY2UgYW5kIGFkanVzdCBpZnJhbWUgcHJvcGVydGllcyBhY2NvcmRpbmdseVxuICAgIGlmIChpc01vYmlsZURldmljZSgpKSB7XG4gICAgICAvLyBBZGQgY2xhc3MgdG8gYWNjZXNzaWJpbGl0eSBkaXYgZm9yIG1vYmlsZSBkaXNwbGF5IHN0YXRlXG4gICAgICBjb25zdCBhY2Nlc3NpYmlsaXR5RGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FjY2Vzc2liaWxpdHknKTtcbiAgICAgIGlmIChhY2Nlc3NpYmlsaXR5RGl2KSB7XG4gICAgICAgIGFjY2Vzc2liaWxpdHlEaXYuY2xhc3NMaXN0LmFkZCgndGVycmlmaWMtZGlzcGxheS1vcGVuJyk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGNhcm91c2VsU3JjID0gbmV3IFVSTCgoY2Fyb3VzZWwgYXMgSFRNTElGcmFtZUVsZW1lbnQpLnNyYyk7XG4gICAgY29uc3QgdGltZWxpbmVJZCA9IGNhcm91c2VsU3JjLnNlYXJjaFBhcmFtcy5nZXQoJ2lkJyk7XG4gICAgY29uc3QgZGlzcGxheVVybCA9IG5ldyBVUkwoJy90aW1lbGluZS9kaXNwbGF5JywgY2Fyb3VzZWxTcmMub3JpZ2luKTtcblxuICAgIC8vIEhhbmRsZSBib3RoIGxlZ2FjeSBmb3JtYXQgKGRhdGEuZGlzcGxheVBhcmFtcykgYW5kIG5ldyBmb3JtYXQgKGRhdGEucGFyYW1zIG9yIGRpcmVjdCBkYXRhKVxuICAgIGxldCBwYXJhbXMgPSBkYXRhO1xuICAgIGlmIChkYXRhICYmIGRhdGEuZGlzcGxheVBhcmFtcykge1xuICAgICAgcGFyYW1zID0gZGF0YS5kaXNwbGF5UGFyYW1zO1xuICAgIH0gZWxzZSBpZiAoZGF0YSAmJiBkYXRhLnBhcmFtcykge1xuICAgICAgcGFyYW1zID0gZGF0YS5wYXJhbXM7XG4gICAgfVxuXG4gICAgLy8gU2V0IFVSTCBwYXJhbWV0ZXJzXG4gICAgaWYgKHBhcmFtcyAmJiB0eXBlb2YgcGFyYW1zID09PSAnb2JqZWN0Jykge1xuICAgICAgaWYgKHBhcmFtcy5pZCkgZGlzcGxheVVybC5zZWFyY2hQYXJhbXMuc2V0KCdpZCcsIHBhcmFtcy5pZCk7XG4gICAgICBpZiAocGFyYW1zLnN0YXJ0VGltZSkge1xuICAgICAgICBkaXNwbGF5VXJsLnNlYXJjaFBhcmFtcy5zZXQoJ3N0YXJ0LXRpbWUnLCBwYXJhbXMuc3RhcnRUaW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChwYXJhbXMub3JpZ2luYWxVcmwpIGRpc3BsYXlVcmwuc2VhcmNoUGFyYW1zLnNldCgnb3JpZ2luYWwtdXJsJywgcGFyYW1zLm9yaWdpbmFsVXJsKTtcbiAgICAgIGlmIChwYXJhbXMubGFuZykgZGlzcGxheVVybC5zZWFyY2hQYXJhbXMuc2V0KCdsYW5nJywgcGFyYW1zLmxhbmcpO1xuICAgIH1cblxuICAgIC8vIEZhbGxiYWNrOiB1c2UgdGltZWxpbmUgSUQgZnJvbSBjYXJvdXNlbCBpZiBubyBJRCBwcm92aWRlZFxuICAgIGlmICghZGlzcGxheVVybC5zZWFyY2hQYXJhbXMuaGFzKCdpZCcpICYmIHRpbWVsaW5lSWQpIHtcbiAgICAgIGRpc3BsYXlVcmwuc2VhcmNoUGFyYW1zLnNldCgnaWQnLCB0aW1lbGluZUlkKTtcbiAgICB9XG5cbiAgICAvLyBBbHdheXMgaW5jbHVkZSB0aGUgY3VycmVudCBwYWdlIFVSTCBmb3Igc2hhcmluZyBmdW5jdGlvbmFsaXR5XG4gICAgZW5zdXJlT3JpZ2luYWxVcmxQYXJhbShkaXNwbGF5VXJsLCBwYXJhbXMpO1xuXG4gICAgY29uc3QgZmluYWxVcmwgPSBkaXNwbGF5VXJsLnRvU3RyaW5nKCk7XG5cbiAgICBkaXNwbGF5SWZyYW1lLnNyYyA9IGZpbmFsVXJsO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZGlzcGxheUlmcmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2UgdGhlIGZ1bGxzY3JlZW4gaWZyYW1lXG4gICAqL1xuICBmdW5jdGlvbiByZXN0b3JlSWZyYW1lT3JpZ2luYWxTaXplKCkge1xuICAgIGlmICghaXNEaXNwbGF5T3BlbiAmJiAhZGlzcGxheUlmcmFtZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChkaXNwbGF5SWZyYW1lKSB7XG4gICAgICBkaXNwbGF5SWZyYW1lLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKGRpc3BsYXlJZnJhbWUpIHtcbiAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGRpc3BsYXlJZnJhbWUhKTtcbiAgICAgICAgICBkaXNwbGF5SWZyYW1lID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSwgMTAwKTsgLy8gUmVkdWNlZCB0aW1lb3V0IGZvciBmYXN0ZXIgY2xlYW51cFxuICAgIH1cblxuICAgIGlmIChpc01vYmlsZURldmljZSgpKSB7XG4gICAgICAvLyBSZW1vdmUgY2xhc3MgZnJvbSBhY2Nlc3NpYmlsaXR5IGRpdiBmb3IgbW9iaWxlXG4gICAgICBjb25zdCBhY2Nlc3NpYmlsaXR5RGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FjY2Vzc2liaWxpdHknKTtcbiAgICAgIGlmIChhY2Nlc3NpYmlsaXR5RGl2KSB7XG4gICAgICAgIGFjY2Vzc2liaWxpdHlEaXYuY2xhc3NMaXN0LnJlbW92ZSgndGVycmlmaWMtZGlzcGxheS1vcGVuJyk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChPVkVSTEFZX0lEKTtcbiAgICBpZiAob3ZlcmxheSkge1xuICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChvdmVybGF5KTtcbiAgICB9XG5cbiAgICBjb25zdCBjYXJvdXNlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKExBVU5DSFJfSUQpO1xuICAgIGlmIChjYXJvdXNlbCAmJiBvcmlnaW5hbFN0eWxlcykge1xuICAgICAgKGNhcm91c2VsIGFzIEhUTUxJRnJhbWVFbGVtZW50KS5zdHlsZS5maWx0ZXIgPVxuICAgICAgICAob3JpZ2luYWxTdHlsZXMgYXMge2ZpbHRlcj86IHN0cmluZ30pLmZpbHRlciB8fCAnbm9uZSc7XG4gICAgfVxuXG4gICAgaXNEaXNwbGF5T3BlbiA9IGZhbHNlO1xuXG4gICAgbGFzdFVybFNlbnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGUgc2hhcmluZyBVUkwgZnVuY3Rpb25hbGl0eVxuICAgKi9cbiAgZnVuY3Rpb24gaGFuZGxlU2hhcmVVcmwoc2hhcmVVcmw6IHN0cmluZykge1xuICAgIG5hdmlnYXRvci5jbGlwYm9hcmRcbiAgICAgIC53cml0ZVRleHQoc2hhcmVVcmwpXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIFVSTCBjb3BpZWQgc3VjY2Vzc2Z1bGx5XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNvcHkgVVJMOiAnLCBlcnIpO1xuICAgICAgICBwcm9tcHQoJ0NvcHkgdGhpcyBVUkw6Jywgc2hhcmVVcmwpO1xuICAgICAgfSk7XG4gIH1cblxuICAvLyBJbml0aWFsaXplIHRoZSB0aW1lbGluZSBpbnRlZ3JhdGlvblxuICBpbml0VGltZWxpbmVJbnRlZ3JhdGlvbigpO1xufSkoKTtcbiJdfQ==