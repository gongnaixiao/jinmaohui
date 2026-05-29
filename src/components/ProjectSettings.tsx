/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  Database, 
  Share2,
  Bookmark,
  Layers,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Project, EnvVar } from "../types";

interface ProjectSettingsProps {
  project: Project;
  onUpdateEnvVars: (envVars: EnvVar[]) => Promise<void>;
  onDeleteProject: () => Promise<void>;
}

export default function ProjectSettings({ 
  project, 
  onUpdateEnvVars,
  onDeleteProject 
}: ProjectSettingsProps) {
  
  const [envList, setEnvList] = useState<EnvVar[]>([...project.envVars]);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAddEnv = () => {
    if (!newKey || !newVal) return;
    const key = newKey.trim();
    if (envList.some(e => e.key === key)) {
      alert("Variable key already exists in environment list!");
      return;
    }
    const updated = [...envList, { key, value: newVal.trim() }];
    setEnvList(updated);
    setNewKey("");
    setNewVal("");
  };

  const handleDeleteEnv = (key: string) => {
    const updated = envList.filter(e => e.key !== key);
    setEnvList(updated);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateEnvVars(envList);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
      
      {/* Module 1: Environment Variable Configurations */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 text-left">
        <h2 className="text-sm font-mono font-bold text-zinc-100 flex items-center gap-2 border-b border-zinc-850 pb-3">
          <Settings className="w-4 h-4 text-amber-500" />
          Environment Global Variables Matrix
        </h2>

        <p className="text-xs text-zinc-400 leading-relaxed font-sans mt-1">
          Define global constants, authorization tokens, or dynamic headers used during sandbox compilations. 
          Inside Scenario payload templates, they can be referenced using standard token syntax, e.g. <code className="text-amber-400 font-mono font-bold bg-zinc-950 px-1 py-0.5 border border-zinc-900 rounded">${`auth.gateway.host`}</code> &amp; automatically substituted during execute runs.
        </p>

        {/* List variables table */}
        <div className="flex flex-col gap-2.5 mt-2">
          {envList.length === 0 ? (
            <span className="text-xs text-zinc-500 font-mono italic">No constants registered in active project profile.</span>
          ) : (
            envList.map(e => (
              <div key={e.key} className="flex h-auto sm:items-center justify-between bg-zinc-950/40 border border-zinc-850 rounded-xl px-3.5 py-2.5 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 flex-1 min-w-0">
                  <span className="text-xs font-mono font-bold text-amber-500 truncate block sm:w-44">{e.key}</span>
                  <span className="text-xs font-mono text-zinc-300 truncate block flex-1">{e.value}</span>
                </div>
                <button
                  onClick={() => handleDeleteEnv(e.key)}
                  className="text-zinc-650 hover:text-red-400 p-1 cursor-pointer transition-colors"
                  title="Remove variable"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Input form */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 mt-3 pt-4 border-t border-zinc-900">
          <div className="sm:col-span-5">
            <input 
              type="text" 
              placeholder="Variable key: e.g. gateway.token" 
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-hidden focus:border-amber-500"
            />
          </div>
          <div className="sm:col-span-5">
            <input 
              type="text" 
              placeholder="Target value: e.g. tok_prod_101" 
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-hidden focus:border-amber-500"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              onClick={handleAddEnv}
              disabled={!newKey || !newVal}
              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-amber-500 border border-amber-500/20 hover:bg-amber-500/10 rounded-lg disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Register
            </button>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex items-center justify-between border-t border-zinc-900 pt-4 mt-6">
          <span className="text-[10.5px] text-zinc-500 font-mono flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-zinc-650" />
            Changes saved back to file DB.
          </span>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 animate-bounce" /> Variables Saved Successfully
              </span>
            )}

            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4.5 py-2 text-xs font-mono font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-xl disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Configurations
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Module 2: Destructive actions & registry limits */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex flex-col gap-4 text-left">
        <h2 className="text-sm font-mono font-bold text-red-400/80 flex items-center gap-2 border-b border-red-500/10 pb-3">
          <Bookmark className="w-4 h-4 text-red-500/70" />
          Workspace Management Safeguards
        </h2>

        <p className="text-xs text-zinc-400 leading-normal">
          Deleting a Project is irreversible. All jar indices represent, user custom compiled class AST structures, and test suites scenarios will be purged from the file systems.
        </p>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-red-500/10">
          <span className="text-[10px] text-zinc-500 font-mono uppercase font-bold">Active project scope: {project.name}</span>
          <button
            onClick={() => {
              if (confirm("Are you absolutely certain you want to purge this Project and dependencies?")) {
                onDeleteProject();
              }
            }}
            className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 cursor-pointer"
          >
            Purge Project
          </button>
        </div>
      </div>

    </div>
  );
}
