/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  FolderGit, 
  Plus, 
  Search, 
  Braces, 
  Code, 
  Terminal, 
  FileCode, 
  RefreshCw, 
  Upload, 
  ChevronRight, 
  Bookmark, 
  Play, 
  CheckCircle,
  Hash,
  Sparkles,
  Layers
} from "lucide-react";
import { Project, ScannedClass, JarFile } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ClassScannerProps {
  project: Project;
  onAddJar: (name: string, mavenCoordinate?: string) => Promise<void>;
  onCompileCustomClass: (sourceCode: string) => Promise<void>;
  onSelectMethod: (className: string, methodName: string) => void;
}

export default function ClassScanner({ 
  project, 
  onAddJar, 
  onCompileCustomClass,
  onSelectMethod
}: ClassScannerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [isAddingJar, setIsAddingJar] = useState(false);
  const [newJarName, setNewJarName] = useState("");
  const [newJarGAV, setNewJarGAV] = useState("");
  
  const [selectedClass, setSelectedClass] = useState<ScannedClass | null>(
    project.classes[0] || null
  );

  // Source code editor context preset (A highly realistic standard UserService example!)
  const [javaSource, setJavaSource] = useState(`package com.company.sandbox;

import com.company.annotation.DubboService;
import com.company.annotation.Service;

@Service
@DubboService(version = "1.0.0")
public class CouponService {

    public String redeemCoupon(String couponCode, Long userId) {
        if (couponCode == null || couponCode.trim().isEmpty()) {
            throw new IllegalArgumentException("Coupon code parameter must not be empty.");
        }
        
        if (userId == null) {
            throw new NullPointerException("userId reference must not be null.");
        }
        
        System.out.println("Processing coupon code: " + couponCode + " for user: " + userId);
        return "SUCCESS_VAL_8910";
    }

    public Double calculateDiscount(Double cartTotal, String membershipTier) {
        if (cartTotal < 0) {
            throw new IllegalArgumentException("Cart total must be positive.");
        }
        
        if ("PLATINUM".equals(membershipTier)) {
            return cartTotal * 0.20; // 20% off
        } else if ("GOLD".equals(membershipTier)) {
            return cartTotal * 0.10; // 10% off
        }
        return 0.0;
    }
}
`);

  const filteredClasses = project.classes.filter(c => 
    c.className.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.fullyQualifiedName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCompilerAction = async () => {
    setIsCompiling(true);
    try {
      await onCompileCustomClass(javaSource);
      // Select the newest class
      const fullyQualified = javaSource.match(/package\s+([\w\.]+);/)?.[1] + "." + javaSource.match(/(?:class|interface)\s+(\w+)/)?.[1];
      const newlyAdded = project.classes.find(c => c.fullyQualifiedName === fullyQualified);
      if (newlyAdded) setSelectedClass(newlyAdded);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleAddJarAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJarName) return;
    setIsAddingJar(true);
    try {
      await onAddJar(newJarName, newJarGAV);
      setNewJarName("");
      setNewJarGAV("");
      setIsAddingJar(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingJar(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto items-stretch h-full">
      {/* LEFT COLUMN: JAR Registry & Class browser (5 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Module 1: Libraries classpath */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Runtime Classpath Imports
            </h2>
            <button 
              onClick={() => setIsAddingJar(!isAddingJar)}
              className="px-2 py-1 text-xs font-mono font-medium rounded-lg text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-3 h-3" />
              Add JAR / dependency
            </button>
          </div>

          <AnimatePresence>
            {isAddingJar && (
              <motion.form 
                onSubmit={handleAddJarAction}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800 flex flex-col gap-3 overflow-hidden"
              >
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">JAR Filename</label>
                  <input 
                    type="text" 
                    placeholder="order-processor-sdk-2.0.jar" 
                    required
                    value={newJarName}
                    onChange={e => setNewJarName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Maven GAV coordinates (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="com.company:order-sdk:2.0.0"
                    value={newJarGAV}
                    onChange={e => setNewJarGAV(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingJar(false)} 
                    className="px-2.5 py-1.5 text-[11px] font-mono rounded bg-transparent text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-3 py-1.5 text-[11px] font-mono rounded bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    Load module
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* JAR Files list */}
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
            {project.jarFiles.length === 0 ? (
              <span className="text-xs text-zinc-500 font-mono italic">No custom jar modules loaded on classpath yet.</span>
            ) : (
              project.jarFiles.map(j => (
                <div key={j.id} className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800/80 rounded-xl px-3 py-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FolderGit className="w-4 h-4 text-amber-500/70" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-semibold text-zinc-200 block truncate">{j.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block truncate">
                        {j.mavenCoordinate || `${(j.size / 1024 / 1024).toFixed(2)} MB`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-medium">
                    Scanned
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Module 2: Scanned Class tree view */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-mono font-bold text-zinc-100">Scanned APIs Explorer</h2>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search classes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500/40 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] pr-1">
            {filteredClasses.length === 0 ? (
              <span className="text-xs text-zinc-500 font-mono italic text-center py-4">No matching APIs filtered.</span>
            ) : (
              filteredClasses.map(c => {
                const isSelected = selectedClass?.fullyQualifiedName === c.fullyQualifiedName;
                return (
                  <button
                    key={c.fullyQualifiedName}
                    onClick={() => {
                      setSelectedClass(c);
                    }}
                    className={`text-left w-full rounded-xl p-3 border cursor-pointer transition-all flex flex-col gap-1.5 ${
                      isSelected 
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.03)]" 
                        : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 text-zinc-300 hover:text-zinc-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold truncate">
                        {c.className}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                        c.type === "INTERFACE" 
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {c.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block truncate font-mono">
                      {c.packageName}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.annotations?.map(ann => (
                        <span key={ann} className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1 py-0.2 rounded font-mono font-semibold">
                          {ann}
                        </span>
                      ))}
                      {c.isCustom && (
                        <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.2 rounded font-mono font-bold flex items-center gap-0.5">
                          <Code className="w-2 h-2" />
                          Custom
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: JVM Sandbox Compiler Editor or Method metadata visualizer (7 cols) */}
      <div className="lg:col-span-7 flex flex-col h-full gap-6">
        
        {/* Switch tab style view for class: Compiler Sandbox vs Signature explorer */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5 flex-1 justify-between min-h-[500px]">
          
          <div className="flex flex-col gap-4">
            
            {/* Header tab controller */}
            <div className="border-b border-zinc-800 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center">
                  <Terminal className="text-amber-500/80 w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold text-zinc-200 block uppercase">
                    Dynamically Loaded JVM Signature
                  </h3>
                  <span className="text-[10.5px] font-mono text-zinc-500 block truncate">
                    {selectedClass ? selectedClass.fullyQualifiedName : "Configure workspace module"}
                  </span>
                </div>
              </div>

              {selectedClass && (
                <span className="text-xs font-mono bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-zinc-400">
                  {selectedClass.methods.length} Scanned API Method(s)
                </span>
              )}
            </div>

            {/* If a class is selected, show its API list */}
            {selectedClass ? (
              <div className="flex flex-col gap-4">
                
                {/* Visual method list explorer */}
                <div className="flex flex-col gap-3.5 max-h-[460px] overflow-y-auto pr-1">
                  {selectedClass.methods.map(method => (
                    <div 
                      key={method.name} 
                      className="bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-4 flex flex-col gap-3 transition-colors text-left"
                    >
                      {/* Signature Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-2.5">
                        <div className="flex items-center gap-1.5 font-mono flex-wrap">
                          <span className="text-amber-500 text-[11px] font-medium">{method.modifiers.join(" ")}</span>
                          <span className="text-teal-400 text-[11px] font-semibold">{method.returnType}</span>
                          <span className="text-zinc-100 font-bold text-xs">{method.name}</span>
                          <span className="text-zinc-500">(</span>
                          {method.parameters.map((p, idx) => (
                            <React.Fragment key={p.name}>
                              <span className="text-zinc-400 text-xs">{p.type}</span>
                              <span className="text-amber-300 font-semibold text-[11px]">{p.name}</span>
                              {idx < method.parameters.length - 1 && <span className="text-zinc-500">,</span>}
                            </React.Fragment>
                          ))}
                          <span className="text-zinc-500">)</span>
                        </div>

                        {/* Invoke Button */}
                        <button 
                          onClick={() => onSelectMethod(selectedClass.fullyQualifiedName, method.name)}
                          className="px-2.5 py-1 text-[10.5px] font-mono font-bold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Invoke API
                        </button>
                      </div>

                      {/* Description and parameter field specs */}
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans mt-1">
                        {method.description || "No class documentation annotation generated."}
                      </p>

                      {method.parameters.some(p => !p.isPrimitiveOrSimple && p.fields) && (
                        <div className="bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-800/40">
                          <span className="text-[10px] font-mono uppercase font-bold text-zinc-500 block mb-1.5 flex items-center gap-1">
                            <Braces className="w-3.5 h-3.5 text-zinc-500" />
                            Complex Parameter DTO fields:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                            {method.parameters.map(p => 
                              p.fields?.map(f => (
                                <div key={f.name} className="flex items-center justify-between font-mono bg-zinc-950 px-2 py-1 rounded">
                                  <span className="text-zinc-300">{f.name}</span>
                                  <span className="text-zinc-500 truncate">{f.type} {f.isRequired && <span className="text-red-500">*</span>}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <Bookmark className="w-10 h-10 text-zinc-700 animate-bounce" />
                <span className="text-sm font-mono text-zinc-500">
                  Select an enterprise Scanned API Class or write a custom compile model above.
                </span>
              </div>
            )}
            
          </div>

          {/* Quick interactive compiler panel block */}
          <div className="border-t border-zinc-800/80 pt-5 mt-6">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3.5">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  JVM Virtual Complier Sandbox Editor ({javaSource.split("\n").length} Lines)
                </span>
                <span className="text-[10px] font-mono text-zinc-500">compile & hot-reload in Node</span>
              </div>

              <textarea 
                className="w-full h-44 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-emerald-400 font-mono focus:outline-hidden focus:border-amber-500 leading-relaxed overflow-y-auto"
                value={javaSource}
                onChange={e => setJavaSource(e.target.value)}
              />

              <div className="flex items-center justify-between gap-4">
                <span className="text-[10.5px] font-sans text-zinc-500 flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5 text-zinc-600" />
                  Will extract package name, imports, variables and methods dynamically using our scan system.
                </span>
                
                <button
                  type="button"
                  disabled={isCompiling}
                  onClick={handleCompilerAction}
                  className="px-4 py-1.5 font-mono font-bold rounded-lg text-zinc-950 bg-amber-500 hover:bg-amber-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all text-xs"
                >
                  {isCompiling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Scanning class...
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3.5 h-3.5" />
                      Compile & Scan API
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
