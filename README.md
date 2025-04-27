# Fake Fullscreen Overlay with Parent Page Blur

This example demonstrates how to create a "fake fullscreen" effect from an iframe, where:
1. A launcher iframe triggers a fullscreen overlay
2. The parent page gets blurred behind the overlay
3. A second iframe is displayed in the overlay

## How It Works

The example consists of three HTML files:

- `index.html`: The parent page that hosts the launcher iframe and contains the necessary code to create the fullscreen overlay and blur effect
- `launcher.html`: The first iframe with a button that triggers the fullscreen effect
- `fullscreen-content.html`: The content that appears in the fullscreen overlay

## How to Use

1. Open `index.html` in your browser
2. Click the "Go Fullscreen" button inside the launcher iframe
3. The parent page will blur and the fullscreen content will appear in an overlay
4. Click the X button in the top-right corner to close the overlay and remove the blur

## Technical Details

This example uses the `postMessage` API for cross-frame communication:

1. The launcher iframe sends a message to the parent page when the button is clicked
2. The parent page listens for this message and:
   - Adds a blur effect to the page
   - Creates an overlay with a second iframe
   - Adds a close button that removes the overlay and blur when clicked

Since browsers isolate iframe contents from their parents for security reasons, this approach requires a small script in the parent page to apply the blur effect and create the overlay.

## Browser Compatibility

This example works in all modern browsers that support:
- `postMessage` API
- CSS filters (for blur effect)
- ES6 template literals

## License

This example is provided under the MIT License. 