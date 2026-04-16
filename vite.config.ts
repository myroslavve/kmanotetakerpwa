import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { readFileSync } from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    https: {
      key: readFileSync(path.resolve(__dirname, 'localhost-key.pem')),
      cert: readFileSync(path.resolve(__dirname, 'localhost.pem')),
    },
  },
});
