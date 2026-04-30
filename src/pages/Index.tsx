import { DumpYardScene } from "@/scene/DumpYardScene";

const Index = () => {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <h1 className="sr-only">OREPACK — Autonomous Dump Yard Digital Twin</h1>
      <DumpYardScene />
    </main>
  );
};

export default Index;
