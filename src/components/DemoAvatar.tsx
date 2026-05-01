import { useState, useEffect } from "react";
import type { Truck } from "@/sim/types";

export function DemoAvatar({ trucks, isDemoMode }: { trucks: Truck[]; isDemoMode: boolean }) {
  const [scriptText, setScriptText] = useState("");
  const [avatarImg, setAvatarImg] = useState("/avatar.png");

  useEffect(() => {
    if (!isDemoMode || trucks.length === 0) return;

    const truck = trucks[0]; // In demo mode, there is only 1 truck
    let text = "";
    let img = "/avatar.png";

    if (truck.totalDumps === 0) {
      if (truck.state === "IDLE" || truck.state === "MOVING") {
        text = "Welcome to the OREPACK Digital Twin. We are demonstrating a solution to the Optimal Packing Problem using dynamic perception instead of pre-defined spot points.";
        img = "/avatar_pointing.png";
      } else if (truck.state === "ARRIVED" || truck.state === "DUMPING") {
        text = "Notice how the truck evaluates the terrain in real-time. It uses our Hexagonal algorithm to find the deepest available space without blocking the entry.";
        img = "/avatar_listening.png";
      }
    } else if (truck.totalDumps === 1) {
      if (truck.state === "RETURNING" || truck.state === "MOVING" || truck.state === "IDLE") {
        text = "First dump complete. By eliminating fixed lanes, we eliminate 'low spots' and optimize the exact geometric footprint.";
        img = "/avatar.png";
      } else if (truck.state === "ARRIVED" || truck.state === "DUMPING") {
        text = "Watch closely. It's positioning itself exactly 3.03 meters away from the first pile. This matches the efficiency of staffed human operators.";
        img = "/avatar_pointing.png";
      }
    } else if (truck.totalDumps === 2) {
      if (truck.state === "RETURNING" || truck.state === "MOVING" || truck.state === "IDLE") {
        text = "Two down. Our dynamic collision avoidance ensures they can pack this tightly without false-positive obstacle detection.";
        img = "/avatar_listening.png";
      } else if (truck.state === "ARRIVED" || truck.state === "DUMPING") {
        text = "The back-to-front sweeping algorithm ensures no area of the polygon is ever blocked or isolated from future trucks.";
        img = "/avatar.png";
      }
    } else if (truck.totalDumps === 3) {
      if (truck.state === "RETURNING" || truck.state === "MOVING" || truck.state === "IDLE") {
        text = "One last dump to complete the grid. Notice how perfectly the honeycomb pattern is forming.";
        img = "/avatar_pointing.png";
      } else if (truck.state === "ARRIVED" || truck.state === "DUMPING") {
        text = "Lifting the bed for the final dump. The kinematic turning radius ensures the truck is perfectly aligned before dumping.";
        img = "/avatar_listening.png";
      }
    } else if (truck.totalDumps >= 4) {
      text = "Demonstration complete. We have successfully achieved maximum packing density autonomously. 4 perfect dumps, zero gaps. Thank you for watching!";
      img = "/avatar_thumbsup.png";
    }

    setScriptText(text);
    setAvatarImg(img);
  }, [trucks, isDemoMode]);

  // Handle Text-to-Speech
  useEffect(() => {
    if (!isDemoMode || !scriptText) {
      window.speechSynthesis.cancel();
      return;
    }

    window.speechSynthesis.cancel(); // Stop current speech before starting new one
    
    const utterance = new SpeechSynthesisUtterance(scriptText);
    utterance.rate = 0.95; // Slightly slower, more professional pacing
    utterance.pitch = 1.0; // Natural pitch
    
    // Voices load asynchronously in some browsers, so we get what's available
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    
    // Curated list of high-quality premium voices
    const preferredVoices = ['Ava', 'Google UK English Female', 'Samantha', 'Veena', 'Victoria', 'Moira', 'Karen'];
    
    let selectedVoice = null;
    for (const pref of preferredVoices) {
      selectedVoice = englishVoices.find(v => v.name.includes(pref));
      if (selectedVoice) break;
    }
    
    // Fallback to any female voice, or the first available English voice
    if (!selectedVoice) {
      selectedVoice = englishVoices.find(v => v.name.includes('Female') || v.name.includes('Zira')) || englishVoices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [scriptText, isDemoMode]);

  if (!isDemoMode || !scriptText) return null;

  return (
    <div className="absolute bottom-16 right-6 flex items-end gap-4 z-50 animate-in slide-in-from-right-8 fade-in duration-500">
      <div className="bg-background/95 backdrop-blur border border-primary/30 p-4 shadow-2xl shadow-primary/10 max-w-sm relative rounded-tl-xl rounded-tr-xl rounded-bl-xl">
        <p className="text-sm text-foreground/90 leading-relaxed">
          {scriptText}
        </p>
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-background/95 border-b border-r border-primary/30 transform rotate-45" />
      </div>
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/50 shadow-[0_0_15px_rgba(251,191,36,0.3)] bg-slate-900 transition-all duration-300">
          <img key={avatarImg} src={avatarImg} alt="Caterpillar Engineer AI" className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-500" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded tracking-wider border border-primary-foreground/20 shadow-sm whitespace-nowrap">
          AI GUIDE
        </div>
      </div>
    </div>
  );
}
