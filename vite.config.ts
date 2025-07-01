import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    // 自定义插件来确保正确的模块加载顺序
    {
      name: 'ensure-react-load-order',
      transformIndexHtml(html) {
        // 确保 React 在所有其他模块之前加载
        return html.replace(
          /<link rel="modulepreload"[^>]+href="([^"]+vendor[^"]+)"[^>]*>/,
          (match, vendorPath) => {
            // 查找 React chunk
            const reactMatch = html.match(/<link rel="modulepreload"[^>]+href="([^"]+react[^"]+)"[^>]*>/);
            if (reactMatch) {
              // 先加载 React，然后加载 vendor
              return `<link rel="modulepreload" crossorigin href="${reactMatch[1]}">
    <link rel="modulepreload" crossorigin href="${vendorPath}">`;
            }
            return match;
          }
        ).replace(
          // 移除重复的 React preload
          /<link rel="modulepreload"[^>]+href="[^"]+react[^"]+"[^>]*>/g,
          (match, offset, string) => {
            // 只保留第一个 React preload
            const firstIndex = string.indexOf(match);
            return offset === firstIndex ? match : '';
          }
        );
      }
    }
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
        // 使用函数形式的 manualChunks 以获得更好的控制
        manualChunks(id) {
          // 调试信息
          if (id.includes('node_modules')) {
            // React 核心库必须在最优先的 chunk
            if (id.includes('node_modules/react/') || 
                id.includes('node_modules/react-dom/') ||
                id.includes('react/jsx-runtime')) {
              return 'react';
            }
            
            // Radix UI 组件
            if (id.includes('@radix-ui/')) {
              return 'ui';
            }
            
            // 其他第三方库
            return 'vendor';
          }
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
