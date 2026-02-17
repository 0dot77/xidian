import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  srcDir: '.',
  modules: ['@wxt-dev/module-react'],
  runner: {
    disabled: true,
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      minify: false,
    },
  }),
  manifest: {
    name: 'X to Obsidian',
    description: 'Capture X/Twitter posts to Obsidian as clean markdown',
    version: '1.0.0',
    permissions: ['activeTab', 'storage'],
    host_permissions: ['*://x.com/*', '*://twitter.com/*'],
    action: {
      default_title: 'Toggle X to Obsidian selection mode',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    commands: {
      'toggle-selection': {
        suggested_key: {
          default: 'Ctrl+Shift+X',
          mac: 'Command+Shift+X',
        },
        description: 'Toggle tweet selection mode',
      },
    },
  },
});
