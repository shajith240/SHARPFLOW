import React from "react";
import { AgentBeamVisualization } from "@/components/ai-agents/AgentBeamVisualization";
import { EvervaultCard } from "@/components/ui/evervault-card";

export default function EvervaultDemo() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#C1FF72] to-[#38B6FF] bg-clip-text text-transparent">
            SharpFlow Evervault Card Demo
          </h1>
          <p className="text-white/60 mt-2">
            Hover over the AI agent nodes to see the interactive Evervault card effects
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* AI Agent Beam Visualization */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#C1FF72]">
              AI Agent Workflow Visualization
            </h2>
            <p className="text-white/70">
              This shows the User → Prism → AI Agents workflow with Evervault hover effects on each node.
            </p>
            <div className="h-96 w-full">
              <AgentBeamVisualization className="h-full" />
            </div>
          </div>

          {/* Original Evervault Card Demo */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#38B6FF]">
              Original Evervault Card
            </h2>
            <p className="text-white/70">
              This is the original Evervault card component with SharpFlow branding.
            </p>
            <div className="flex justify-center">
              <div className="w-80 h-80">
                <EvervaultCard 
                  text="SharpFlow" 
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">
              Implementation Features
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-[#C1FF72] font-semibold mb-3">Design System Integration</h3>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li>• SharpFlow brand colors (#C1FF72, #38B6FF)</li>
                  <li>• Pure black backgrounds (#000000)</li>
                  <li>• Reduced glow effects (60-70% opacity)</li>
                  <li>• Fade-only transitions (200-300ms)</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                <h3 className="text-[#38B6FF] font-semibold mb-3">Agent-Specific Styling</h3>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li>• User nodes: White gradient effects</li>
                  <li>• Prism: Full brand gradient</li>
                  <li>• AI Agents: Subtle brand accents</li>
                  <li>• Responsive sizing and spacing</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-[#C1FF72]/10 to-[#38B6FF]/10 rounded-lg p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-3">How to Test</h3>
            <ol className="space-y-2 text-white/80 text-sm">
              <li>1. Hover over any of the circular nodes in the AI Agent Workflow</li>
              <li>2. Watch the animated text patterns and gradient effects</li>
              <li>3. Notice the different color schemes for each agent type</li>
              <li>4. Try the original Evervault card below for comparison</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
