# Privacy Policy — Xidian

**Last updated:** 2026-02-17

## Overview

Xidian is a Chrome extension that helps users save X (Twitter) posts to Obsidian as markdown notes. Your privacy is important to us.

## Data Collection

**Xidian does NOT collect, store, or transmit any personal data.**

- No analytics or tracking
- No user accounts
- No data sent to external servers
- No cookies created or read (except X's own cookies used solely for authenticated API requests within x.com)

## What the Extension Accesses

Xidian only operates on `x.com` and `twitter.com`. When you activate Selection Mode and click a tweet, the extension:

1. **Reads tweet content** (text, images, timestamps, metrics) from the current page DOM
2. **Intercepts X's own API responses** within the page to retrieve full tweet text for long-form posts — no additional external requests are made for this
3. **Stores your settings** (vault name, save path, export preferences) locally using `chrome.storage.sync`, which syncs across your Chrome browsers if signed in

## Data Storage

- **Settings** are stored locally via Chrome's built-in `chrome.storage.sync` API
- **Tweet content** is never stored by the extension — it is passed directly to Obsidian via URI scheme, clipboard, or local REST API
- No data is retained after the export is complete

## Permissions

| Permission | Why |
|-----------|-----|
| `activeTab` | To inject the selection mode overlay on the current tab |
| `storage` | To save your extension settings (vault name, preferences) |
| Host access to `x.com` / `twitter.com` | To run the content script that reads tweet data |

## Third-Party Services

Xidian communicates only with:
- **x.com** — to read tweet data (same-origin, using your existing login session)
- **Obsidian** — via local URI scheme (`obsidian://`) or local REST API (`localhost`) if configured

No data is sent to any other third-party service.

## Changes

If this policy changes, updates will be posted in the GitHub repository.

## Contact

For questions about this privacy policy, please open an issue at [github.com/0dot77/xidian](https://github.com/0dot77/xidian).
