import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  optimizeDeps: {
    // 确保这些依赖被预构建
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    // 强制包含所有 @radix-ui 组件
    entries: [
      'client/src/main.tsx',
      'client/src/App.tsx',
    ],
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    // 目标环境
    target: 'es2015',
    // 优化构建配置
    rollupOptions: {
      output: {
        // 简化 chunk 策略，让 Vite 自动处理
        manualChunks: {
          // 只将 React 相关的包单独打包
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
        },
        // 生成更好的文件名
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // 分块策略
    chunkSizeWarningLimit: 500,
    // 启用CSS代码分割
    cssCodeSplit: true,
    // 优化资源内联阈值
    assetsInlineLimit: 4096,
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "levelupsolo-production.up.railway.app",
      ".railway.app",
      ".levelupsolo.net",
      "levelupsolo.net",
      "www.levelupsolo.net"
    ]
  }
});
