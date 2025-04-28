// Initialize fullscreen overlay styles and functionality
(function() {
  // Create and inject styles
  const styles = `
    #myFullscreenOverlay {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      background-color: rgba(0,0,0,0.2);
    }
    body.blurred > *:not(#myFullscreenOverlay) { 
      filter: blur(8px); 
    }
  `;
  
  // Inject styles into document head
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
  
  // Create overlay element if it doesn't exist
  if (!document.getElementById('myFullscreenOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'myFullscreenOverlay';
    document.body.appendChild(overlay);
  }
  
  // Set up event listener for iframe messages
  window.addEventListener('message', e => {
    if (e.data.type === 'LAUNCH_FSR_IFRAME') {
      const iframeUrl = e.data.url; // <-- get the URL from the message
      document.body.classList.add('blurred');
      const ov = document.getElementById('myFullscreenOverlay');
      ov.innerHTML = `
        <iframe src="${iframeUrl}"
                style="width:50%; height:50%; border:none">
        </iframe>
        <button id="closeFSR" style="position:absolute;top:1em;right:1em;">
          ✕
        </button>`;
      ov.style.display = 'flex';
      ov.querySelector('#closeFSR').onclick = () => {
        document.body.classList.remove('blurred');
        ov.style.display = 'none';
        ov.innerHTML = '';
      };
    }
  });
})(); 