/// <reference types="web-bluetooth" />
import React, { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Thermometer, Droplets, Bluetooth, BluetoothConnected, BluetoothOff, Zap, Play, Square, AlertTriangle, X, Stethoscope } from 'lucide-react';

// --- 类型定义 ---
interface DataPoint {
  time: string;
  heartRate: number;
  temperature: number;
  oxygen: number;
}

const MAX_DATA_POINTS = 60;

export default function App() {
  // --- 状态管理 ---
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [data, setData] = useState<DataPoint[]>([]);
  
  const [currentHR, setCurrentHR] = useState<number>(0);
  const [currentTemp, setCurrentTemp] = useState<number>(0);
  const [currentSpO2, setCurrentSpO2] = useState<number>(0);

  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- 蓝牙配置 ---
  const SERVICE_UUID = 0xFFE0; 
  const CHARACTERISTIC_UUID = 0xFFE1;

  // --- 辅助函数 ---
  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);
  };

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  const updateData = (hr: number, temp: number, spo2: number) => {
    setCurrentHR(hr);
    setCurrentTemp(temp);
    setCurrentSpO2(spo2);

    setData(prevData => {
      const newData = [...prevData, {
        time: formatTime(new Date()),
        heartRate: hr,
        temperature: temp,
        oxygen: spo2
      }];
      if (newData.length > MAX_DATA_POINTS) {
        return newData.slice(newData.length - MAX_DATA_POINTS);
      }
      return newData;
    });
  };

  // --- 蓝牙连接逻辑 (保持不变) ---
  const connectBluetooth = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.bluetooth) throw new Error('不支持 Web Bluetooth API');
      
      addLog('搜索设备...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID] 
      });

      addLog(`设备: ${device.name}`);
      setDevice(device);

      const server = await device.gatt?.connect();
      addLog('已连接');

      const service = await server?.getPrimaryService(SERVICE_UUID);
      const characteristic = await service?.getCharacteristic(CHARACTERISTIC_UUID);

      await characteristic?.startNotifications();
      addLog('监听数据...');

      characteristic?.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
      device.addEventListener('gattserverdisconnected', onDisconnected);

      setIsConnected(true);
      setIsDemoMode(false);

    } catch (error: any) {
      console.error(error);
      if (error.toString().includes('permissions policy')) {
        setErrorMsg('权限错误: 请在本地 localhost 或 HTTPS 环境运行。');
      } else {
        setErrorMsg(`连接失败: ${error.message}`);
      }
    }
  };

  const disconnectBluetooth = () => {
    if (device && device.gatt?.connected) device.gatt.disconnect();
  };

  const onDisconnected = () => {
    addLog('已断开');
    setIsConnected(false);
    setDevice(null);
  };

  // --- 数据解析 ---
  const handleCharacteristicValueChanged = (event: any) => {
    const value = event.target.value as DataView;
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(value).trim(); 
    
    try {
        let hr = currentHR;
        let temp = currentTemp;
        let spo2 = currentSpO2;
        let updated = false;

        const hrMatch = text.match(/H:(\d+)/);
        if (hrMatch) { hr = parseInt(hrMatch[1]); updated = true; }

        const tempMatch = text.match(/T:([\d.]+)/);
        if (tempMatch) { temp = parseFloat(tempMatch[1]); updated = true; }

        const spo2Match = text.match(/O:(\d+)/);
        if (spo2Match) { spo2 = parseInt(spo2Match[1]); updated = true; }

        if (updated) updateData(hr, temp, spo2);
        
    } catch (e) {
        console.warn("解析错误", e);
    }
  };

  // --- 演示模式 ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    // 定义模拟数据的初始基准值（使用局部变量，不依赖 React 状态，防止闭包陷阱）
    let mockHR = 75;
    let mockTemp = 36.5;
    let mockSpO2 = 98;

    if (isDemoMode) {
      addLog('平滑演示数据生成中...');
      interval = setInterval(() => {
        // 1. 心率算法: 每次波动 -2 到 +2 之间，限制在 60-110 范围内
        // 这样曲线会连续变化，不会突然跳变
        const changeHR = Math.floor(Math.random() * 5) - 2; 
        mockHR = Math.max(60, Math.min(110, mockHR + changeHR));

        // 2. 体温算法: 每次波动 -0.1 到 +0.1，限制在 36.0-37.3 范围内
        const changeTemp = (Math.random() * 0.2) - 0.1;
        mockTemp = Math.max(36.0, Math.min(37.3, mockTemp + changeTemp));
        const finalTemp = parseFloat(mockTemp.toFixed(1)); // 格式化为1位小数

        // 3. 血氧算法: 波动很小，倾向于保持在 97-100，偶尔掉到 95
        // 70% 概率不变，30% 概率波动
        if (Math.random() > 0.7) {
            const changeSpO2 = Math.random() > 0.5 ? 1 : -1;
            mockSpO2 = Math.max(95, Math.min(100, mockSpO2 + changeSpO2));
        }

        updateData(mockHR, finalTemp, mockSpO2);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isDemoMode]);

  // --- UI 部分 ---
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden flex flex-col relative">
      
      {/* 错误提示弹窗 */}
      {errorMsg && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md animate-in slide-in-from-top-5 fade-in">
          <div className="bg-white border-l-4 border-red-500 p-4 rounded-lg shadow-xl flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-sm mb-1">连接提示</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>
      )}

      {/* 顶部导航栏 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-sm">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-gray-900">BioSync Pro</h1>
            <p className="text-xs text-gray-500">医疗级数据监测终端</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${isConnected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
          {isConnected ? <BluetoothConnected size={14} /> : <BluetoothOff size={14} />}
          <span>{isConnected ? '设备已连接' : '等待连接'}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 max-w-5xl mx-auto w-full">
        
        {/* 操作控制区 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-gray-900 font-bold text-base flex items-center gap-2">
                <Bluetooth className="w-4 h-4 text-blue-500" />
                设备配对
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                请开启设备电源。数据格式要求: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600 font-mono text-xs">H:xx,T:xx,O:xx</code>
              </p>
            </div>
            <div className="flex gap-3">
              {!isConnected ? (
                <button onClick={connectBluetooth} disabled={isDemoMode} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 active:scale-[0.98] transition-all py-2.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:shadow-none">
                  <Bluetooth size={18} /> 连接设备
                </button>
              ) : (
                <button onClick={disconnectBluetooth} className="flex-1 bg-white hover:bg-gray-50 text-red-500 border border-red-100 active:scale-[0.98] transition-all py-2.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm">
                  <BluetoothOff size={18} /> 断开连接
                </button>
              )}
              <button onClick={() => setIsDemoMode(!isDemoMode)} className={`px-4 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm transition-all border ${isDemoMode ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'}`}>
                {isDemoMode ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />} 
                {isDemoMode ? '停止演示' : '演示模式'}
              </button>
            </div>
          </div>

          {/* 日志区 */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col h-36 md:h-auto overflow-hidden">
            <div className="flex justify-between items-center mb-2">
               <h2 className="text-gray-400 text-xs font-bold uppercase tracking-wider">运行日志</h2>
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar pr-1">
              {logs.length === 0 && <span className="text-gray-400 italic">暂无活动...</span>}
              {logs.map((log, i) => (
                <div key={i} className="text-gray-600 border-l-2 border-blue-400 pl-2 py-0.5 leading-tight">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 数据卡片区 */}
        <section className="grid grid-cols-3 gap-3 md:gap-5">
          <DataCard 
            title="心率" 
            value={currentHR} 
            unit="bpm" 
            icon={<Activity className="text-rose-500" />} 
            bgClass="bg-white border-gray-100"
            textClass="text-rose-600"
            labelClass="text-rose-100"
          />
          <DataCard 
            title="体温" 
            value={currentTemp} 
            unit="°C" 
            icon={<Thermometer className="text-blue-500" />} 
            bgClass="bg-white border-gray-100"
            textClass="text-blue-600"
            labelClass="text-blue-100"
          />
          <DataCard 
            title="血氧" 
            value={currentSpO2} 
            unit="%" 
            icon={<Droplets className="text-emerald-500" />} 
            bgClass="bg-white border-gray-100"
            textClass="text-emerald-600"
            labelClass="text-emerald-100"
          />
        </section>

        {/* 图表区 */}
        <section className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-2">
            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              实时趋势分析
            </h3>
            <div className="flex items-center gap-3 text-xs font-medium bg-gray-50 p-2 rounded-lg self-start md:self-auto">
              <span className="flex items-center gap-1.5 text-gray-600"><span className="w-2 h-2 rounded-full bg-rose-500"></span> 心率</span>
              <span className="flex items-center gap-1.5 text-gray-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 体温</span>
              <span className="flex items-center gap-1.5 text-gray-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 血氧</span>
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {/* 修改 1: 增加 margin left/right 防止纵轴被遮挡 */}
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSpO2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8" 
                  tick={{fontSize: 11}} 
                  tickMargin={10}
                  axisLine={false}
                />
                
                {/* 左轴：心率 (红色) */}
                <YAxis 
                  yAxisId="left" 
                  stroke="#f43f5e" 
                  domain={[40, 160]} 
                  tick={{fontSize: 11}} 
                  axisLine={false} 
                  width={30}
                />

                {/* 右轴 1：血氧 (绿色) - 正常显示 */}
                <YAxis 
                  yAxisId="spo2" 
                  orientation="right" 
                  stroke="#10b981" 
                  domain={[80, 105]} 
                  tick={{fontSize: 11}} 
                  axisLine={false} 
                  width={30}
                />

                {/* 右轴 2：体温 (蓝色) - 新增显示！
                    注意：因为图表右侧空间有限，两个右轴可能会数字重叠。
                    为了区分，体温轴不显示轴线，数值通常在 36-37 之间，与血氧 (90+) 不会重叠。
                */}
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#3b82f6" 
                  domain={[30, 45]} 
                  tick={{fontSize: 11}} 
                  axisLine={false} 
                  width={30}
                  // 为了不和血氧轴完全重叠，可以隐藏这个轴的刻度线，只显示值，或者接受它们并列
                />

                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                />
                
                <Area yAxisId="left" type="monotone" dataKey="heartRate" stroke="#f43f5e" fill="url(#colorHr)" strokeWidth={2.5} animationDuration={1000} name="心率" />
                {/* 体温对应 yAxisId="right" */}
                <Area yAxisId="right" type="monotone" dataKey="temperature" stroke="#3b82f6" fill="url(#colorTemp)" strokeWidth={2.5} animationDuration={1000} name="体温" />
                {/* 血氧对应 yAxisId="spo2" */}
                <Area yAxisId="spo2" type="monotone" dataKey="oxygen" stroke="#10b981" fill="url(#colorSpO2)" strokeWidth={2.5} animationDuration={1000} name="血氧" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>
    </div>
  );
}

// 子组件：数据卡片
function DataCard({ title, value, unit, icon, bgClass, textClass }: any) {
  return (
    <div className={`${bgClass} p-4 rounded-2xl border shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group transition-all hover:shadow-md`}>
      {/* 背景装饰图标 */}
      <div className={`absolute -right-2 -bottom-4 p-3 opacity-10 transform rotate-12 scale-150 transition-transform group-hover:scale-125 ${textClass}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 64 })}
      </div>
      
      <div className="flex items-center gap-2 z-10">
        <div className={`p-1.5 rounded-lg bg-gray-50`}>
          {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
        </div>
        <span className="text-gray-500 text-sm font-medium">{title}</span>
      </div>
      
      <div className="flex items-baseline gap-1 z-10 mt-2">
        <span className={`text-3xl md:text-4xl font-bold tracking-tight ${textClass}`}>
          {value}
        </span>
        <span className="text-gray-400 text-xs font-semibold uppercase">{unit}</span>
      </div>
    </div>
  );
}