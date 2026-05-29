/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Server, Cpu, Database, PlayCircle, Layers, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

interface HeaderProps {
  loadedJarsCount: number;
  loadedClassesCount: number;
  successRate: number;
  totalCallsCount: number;
}

export default function Header({ 
  loadedJarsCount, 
  loadedClassesCount, 
  successRate, 
  totalCallsCount 
}: HeaderProps) {
  const [heapHeap, setHeapHeap] = useState({ used: 412.5, max: 1024 });
  const [cpuLoad, setCpuLoad] = useState(4.2);
  const [activeThreads, setActiveThreads] = useState(8);

  // Animate virtual metrics to look hyper-realistic and authentic
  useEffect(() => {
    const handle = setInterval(() => {
      setHeapHeap(prev => {
        const delta = (Math.random() - 0.5) * 15;
        const nextUsed = Math.min(Math.max(prev.used + delta, 350), 650);
        return { used: Number(nextUsed.toFixed(1)), max: 1024 };
      });
      setCpuLoad(prev => {
        const delta = (Math.random() - 0.5) * 3;
        return Number(Math.min(Math.max(prev + delta, 1.5), 18).toFixed(1));
      });
      if (Math.random() > 0.85) {
        setActiveThreads(prev => {
          const delta = Math.random() > 0.5 ? 1 : -1;
          return Math.min(Math.max(prev + delta, 6), 14);
        });
      }
    }, 4500);

    return () => clearInterval(handle);
  }, []);

  return (
    <div className="bg-zinc-950 border-b border-zinc-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      {/* Title block */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-linear-to-br from-amber-500/10 to-orange-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <Server className="w-6 h-6 text-amber-500 animate-pulse" />
        </div>
        <div>
          <span className="text-[10px] font-mono tracking-widest text-amber-500/70 block uppercase font-semibold">
            Java API Debugger Platform
          </span>
          <h1 className="text-xl font-mono text-zinc-100 tracking-tight font-bold flex items-center gap-2">
            JarLink JVM API Playground
            <span className="text-xs font-normal font-sans bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Runtime Online
            </span>
          </h1>
        </div>
      </div>

      {/* Metrics board */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full md:w-auto">
        {/* Class Registry */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-zinc-700/60 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-mono uppercase font-medium">Virtual Classloader</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-mono text-zinc-100 font-bold">{loadedClassesCount}</span>
            <span className="text-[10px] text-zinc-500 font-mono">Classes</span>
          </div>
          <span className="text-[9px] text-zinc-400 font-mono mt-0.5 block truncate">
            {loadedJarsCount} JAR package targets
          </span>
        </div>

        {/* Dynamic Heap Allocation */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-zinc-700/60 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-mono uppercase font-medium">JVM Heap Size</span>
            <Database className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-mono text-zinc-100 font-bold">{heapHeap.used}</span>
            <span className="text-[10px] text-zinc-500 font-mono">/ {heapHeap.max}MB</span>
          </div>
          {/* Virtual Progress Bar */}
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <motion.div 
              className="bg-amber-500/70 h-full rounded-full"
              animate={{ width: `${(heapHeap.used / heapHeap.max) * 100}%` }}
              transition={{ ease: "easeInOut", duration: 1 }}
            />
          </div>
        </div>

        {/* Virtual CPU load */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-zinc-700/60 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-mono uppercase font-medium">Allocated CPU</span>
            <Cpu className="w-3.5 h-3.5 text-amber-500/60" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-mono text-zinc-100 font-bold">{cpuLoad}%</span>
            <span className="text-[10px] text-zinc-500 font-mono">Load</span>
          </div>
          <span className="text-[9px] text-zinc-400 font-mono mt-0.5 block">
            {activeThreads} JVM Daemon threads
          </span>
        </div>

        {/* Performance execution totals */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-zinc-700/60 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-mono uppercase font-medium">Invokes Executed</span>
            <PlayCircle className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-mono text-zinc-100 font-bold">{totalCallsCount}</span>
            <span className="text-[10px] text-zinc-500 font-mono">Run(s)</span>
          </div>
          <span className="text-[9px] text-zinc-400 font-mono mt-0.5 block">
            Hot-Reload class active
          </span>
        </div>

        {/* Assertions ratios */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-zinc-700/60 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-mono uppercase font-medium">Assertions Success</span>
            {successRate >= 90 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-mono text-zinc-100 font-bold">
              {successRate}%
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Pass</span>
          </div>
          <span className="text-[9px] text-zinc-400 font-mono mt-0.5 block">
            Automatic trace assertion
          </span>
        </div>
      </div>
    </div>
  );
}
