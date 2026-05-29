/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  History, 
  Search, 
  Clock, 
  Terminal, 
  CheckCircle, 
  AlertOctagon, 
  Play, 
  Calendar,
  Layers,
  Cpu,
  RefreshCw,
  Eye
} from "lucide-react";
import { BuildHistoryRecord } from "../types";

interface CallHistoryPanelProps {
  historyList: BuildHistoryRecord[];
  onSelectReplayHistory: (className: string, methodName: string, paramJson: string) => void;
}

export default function CallHistoryPanel({ 
  historyList,
  onSelectReplayHistory 
}: CallHistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<BuildHistoryRecord | null>(
    historyList[0] || null
  );

  const filteredHistory = historyList.filter(h => 
    h.className.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.methodName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto h-full items-stretch">
      
      {/* LEFT COLUMN: History logs list (6 cols) */}
      <div className="lg:col-span-6 flex flex-col gap-5">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 flex-1">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-850 pb-3">
            <h2 className="text-sm font-mono font-bold text-zinc-100 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500" />
              Dynamic dispatch history logs
            </h2>
            
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Filter services..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder:text-zinc-650 font-mono focus:outline-hidden focus:border-amber-500/40"
              />
            </div>
          </div>

          {/* List rows */}
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[500px] pr-1">
            {filteredHistory.length === 0 ? (
              <span className="text-xs text-zinc-500 font-mono italic text-center py-8">
                No past sandbox execution traces scanned.
              </span>
            ) : (
              filteredHistory.map(h => {
                const isActive = h.id === selectedLog?.id;
                const passed = h.result.status === "SUCCESS";
                return (
                  <button
                    key={h.id}
                    onClick={() => setSelectedLog(h)}
                    className={`text-left w-full rounded-xl p-3 border cursor-pointer transition-colors flex flex-col gap-2 ${
                      isActive 
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                        : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-mono font-bold truncate">
                        {h.className.split(".").pop()}.{h.methodName}()
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {h.result.executionTimeMs} ms
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono mt-0.5">
                      <span className="text-zinc-500 max-w-[220px] truncate block">
                        Thread: {h.result.threadName || "System_DB-Thread"}
                      </span>
                      <span className={`font-semibold uppercase text-[9.5px] flex items-center gap-1 ${
                        passed ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {passed ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" /> Success
                          </>
                        ) : (
                          <>
                            <AlertOctagon className="w-3.5 h-3.5" /> Exception
                          </>
                        )}
                      </span>
                    </div>

                    <div className="text-[9.5px] text-zinc-500 font-mono flex items-center justify-between pt-1 border-t border-zinc-900/50 mt-1">
                      <span>{new Date(h.invokedAt).toLocaleTimeString()}</span>
                      <span className="opacity-60">CPU: {h.result.cpuLoadPercentage || 1.8}%</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Selected history trace detail analysis viewer (6 cols) */}
      <div className="lg:col-span-6 flex flex-col gap-5">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 flex-1 justify-between min-h-[480px]">
          {selectedLog ? (
            <div className="flex flex-col gap-4">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase font-bold">Execution trace details</span>
                  <h3 className="text-xs font-mono font-bold text-zinc-200">
                    ID: {selectedLog.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectReplayHistory(selectedLog.className, selectedLog.methodName, selectedLog.paramJson)}
                  className="px-3 py-1 font-mono text-[10.5px] font-bold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Play className="w-3 h-3 fill-current" /> Replay in playground
                </button>
              </div>

              {/* API and Thread stats */}
              <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl font-mono text-[10.5px] text-zinc-400 flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase font-bold">Class Reference:</span>
                  <span className="text-zinc-300 text-right max-w-xs truncate">{selectedLog.className}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase font-bold">Dynamic method target:</span>
                  <span className="text-zinc-300 font-bold">{selectedLog.methodName}()</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase font-bold">Dispatched timestamp:</span>
                  <span className="text-zinc-300">{new Date(selectedLog.invokedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Argument param payload inspect */}
              <div>
                <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase block mb-1.5 flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                  Request Parameter Arguments passed:
                </span>
                <pre className="bg-zinc-950 border border-zinc-855 rounded-xl p-3 text-xs font-mono text-zinc-300 leading-relaxed max-h-36 overflow-auto">
                  {selectedLog.paramJson}
                </pre>
              </div>

              {/* Dynamic returned object inspect */}
              <div>
                <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase block mb-1.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                  JVM output stack stream:
                </span>
                <div className="bg-zinc-950 border border-zinc-855 rounded-xl p-3 text-xs font-mono max-h-48 overflow-auto">
                  {selectedLog.result.status === "SUCCESS" ? (
                    <pre className="text-emerald-400 font-medium">
                      {JSON.stringify(selectedLog.result.returnValue, null, 2)}
                    </pre>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <span className="text-red-500 font-bold block bg-red-500/5 p-1.5 rounded border border-red-500/10">
                        {selectedLog.result.exceptionMessage}
                      </span>
                      <pre className="text-[9.5px] text-zinc-500 leading-normal block overflow-x-auto whitespace-pre">
                        {selectedLog.result.stackTrace}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 py-20 text-center">
              <RefreshCw className="w-6 h-6 text-zinc-800 animate-pulse" />
              <span className="text-xs font-mono text-zinc-650">Select an execution log to detail.</span>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-3 mt-4 text-[10px] text-zinc-500 font-sans leading-relaxed text-right">
            Traces logged instantly on file DB sandbox system.
          </div>
        </div>
      </div>

    </div>
  );
}
