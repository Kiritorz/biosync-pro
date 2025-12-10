# BioSync Pro

<div align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=white" alt="React Version">
  <img src="https://img.shields.io/badge/TypeScript-5.0.0-blue?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/TailwindCSS-3.4.0-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/Recharts-2.12.0-0088FE?logo=recharts&logoColor=white" alt="Recharts">
  <img src="https://img.shields.io/badge/Web%20Bluetooth-API-0080FF?logo=bluetooth&logoColor=white" alt="Web Bluetooth API">
</div>

BioSync Pro 是一款基于 Web Bluetooth API 构建的生物数据监测终端，能够实时连接蓝牙医疗设备，采集并可视化心率（HR）、体温（Temperature）、血氧（SpO₂）数据，同时提供演示模式模拟真实数据波动，助力快速调试与功能展示。

## ✨ 核心功能
- �蓝牙设备连接：支持 Web Bluetooth API 配对蓝牙设备，解析标准格式（`H:xx,T:xx,O:xx`）的生物数据
- 📊 实时数据可视化：通过面积图展示心率、体温、血氧的实时趋势，多轴适配不同数据范围
- 🎭 演示模式：无需硬件设备即可生成模拟数据，模拟真实生理指标波动（心率60-110bpm、体温36.0-37.3℃、血氧95-100%）
- 📱 响应式设计：适配移动端、平板、桌面端，界面简洁易用
- 📜 运行日志：实时记录设备连接、数据接收等关键操作，便于调试
- ⚡ 即时反馈：设备连接状态、错误提示等交互反馈，提升用户体验

## 📋 技术栈
- **前端框架**：React 18 (Hooks: useState/useEffect)
- **样式系统**：TailwindCSS 3.x
- **图表可视化**：Recharts (AreaChart 面积图)
- **图标库**：Lucide React
- **API**：Web Bluetooth API (需 HTTPS/localhost 环境)
- **类型校验**：TypeScript

## 🚀 快速开始

### 环境要求
- Node.js ≥ 16.x
- 浏览器支持 Web Bluetooth API（Chrome、Edge、Opera 等 Chromium 内核浏览器）
- 运行环境：HTTPS 或 localhost（Web Bluetooth API 安全策略限制）

### 安装与运行
```bash
# 克隆仓库
git clone https://github.com/your-username/biosync-pro.git
cd biosync-pro

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build