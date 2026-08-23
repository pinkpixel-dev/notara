import path from 'node:path';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { createPollinationsProxyPlugin } from './vite/pollinations-proxy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      host: '::',
      port: 3489,
    },
    plugins: [
      react(),
      mode === 'development' && createPollinationsProxyPlugin(env),
    ].filter(Boolean) as Plugin[],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
