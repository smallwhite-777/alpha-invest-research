import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfjs-dist', 'pdf-parse'],

  // 内存优化配置
  experimental: {
    // 减少并发构建数
    cpus: 1,
  },

  // 减少内存使用
  webpack: (config, { dev, isServer }) => {
    // 减少并发处理的文件数
    config.infrastructureLogging = {
      level: 'error',
    };

    // 优化构建缓存
    if (!isServer) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    return config;
  },

  // 优化输出
  output: 'standalone',

  // 减少 Source Map 生成
  productionBrowserSourceMaps: false,

  // 图片优化配置
  images: {
    unoptimized: true, // 静态部署需要禁用图片优化
  },
};

export default nextConfig;
