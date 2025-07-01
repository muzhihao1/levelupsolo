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
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    // 优化构建配置
    rollupOptions: {
      output: {
        // 手动分割代码块
        manualChunks: (id) => {
          // 优先处理node_modules中的包
          if (id.includes('node_modules')) {
            // React核心库
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // UI组件库
            if (id.includes('@radix-ui') || id.includes('class-variance-authority') || id.includes('clsx')) {
              return 'ui-vendor';
            }
            // 数据获取和状态管理
            if (id.includes('@tanstack/react-query') || id.includes('axios')) {
              return 'data-vendor';
            }
            // 图表库
            if (id.includes('recharts') || id.includes('chart.js')) {
              return 'charts-vendor';
            }
            // 图标库
            if (id.includes('lucide-react') || id.includes('react-icons')) {
              return 'icons-vendor';
            }
            // 其他工具库
            if (id.includes('date-fns') || id.includes('framer-motion')) {
              return 'utils-vendor';
            }
            // 所有其他第三方库
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
