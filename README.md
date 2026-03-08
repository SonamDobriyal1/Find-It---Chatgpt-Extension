# ChatGPT Prompt Navigator (unpacked extension)

Quickly jump to any of your prompts within an open ChatGPT conversation—no more endless scrolling.

## What it does
- Shows a floating panel on ChatGPT with every user prompt in the current chat, in the order they appear.
- Clicking (or pressing Enter/Space) on a prompt scrolls the page to that message and briefly highlights it.
- Panel can be collapsed/expanded and refreshed; it auto-updates as you add messages or switch chats.

## Install (Chrome / Edge)
1) Open `chrome://extensions` (or `edge://extensions`), turn on **Developer mode**.
2) Click **Load unpacked** and select this folder: `C:\Users\HP\Desktop\Chatgpt Extension`.
3) Open ChatGPT at `https://chatgpt.com` (or `https://chat.openai.com`) and the prompt list will appear in the top-right.

## Using it
- The header shows the prompt count; **Refresh** rebuilds the list manually.
- **Hide/Show** collapses the panel if it gets in your way.
- If the list looks empty, wait a moment or hit **Refresh**—the content script watches for new messages and URL changes.

## Notes and limits
- The script looks for elements marked as user messages (e.g., `data-message-author-role="user"`). If the site’s DOM changes, selectors may need a quick tweak in `content.js`.
- No data leaves the page; everything runs locally in the content script.
