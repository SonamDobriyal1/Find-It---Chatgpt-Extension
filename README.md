# AI Chat Prompt Navigator (unpacked extension)

Quickly jump to any of your prompts within an open ChatGPT, Gemini, or Claude conversation.

## What it does
- Shows a floating logo button first, then expands into a prompt list when clicked.
- Lists every user prompt in the current chat, in the order they appear.
- Clicking (or pressing Enter/Space) on a prompt scrolls the page to that message and briefly highlights it.
- Clicking the logo again hides the panel; the list auto-updates as you add messages or switch chats.

## Install (Chrome / Edge)
1) Open `chrome://extensions` (or `edge://extensions`), turn on **Developer mode**.
2) Click **Load unpacked** and select this folder.
3) Open ChatGPT at `https://chatgpt.com` (or `https://chat.openai.com`), Gemini at `https://gemini.google.com`, or Claude at `https://claude.ai` and the prompt list will appear in the top-right.

## Using it
- Click the floating logo to open or close the navigator.
- The header shows the prompt count; **Refresh** rebuilds the list manually.
- If the list looks empty, wait a moment or hit **Refresh**—the content script watches for new messages and URL changes.

## Notes and limits
- The script uses site-specific DOM selectors for ChatGPT, Gemini, and Claude. If any of those sites change their markup, selectors may need a quick tweak in `content.js`.
- No data leaves the page; everything runs locally in the content script.
