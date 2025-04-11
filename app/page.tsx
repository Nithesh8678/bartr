import Image from "next/image";
import Link from "next/link";
import { GridSmallBackgroundDemo } from "@/components/GridSmallBackgroundDemo";
import { FlipWords } from "@/components/ui/flip-words";

export default function Home() {
  const words = ["WORK","SKILL"];
  return (
    <div className="relative min-h-screen w-screen">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white">WORLD'S FIRST <FlipWords words={words} />EXCHANGE PLATFORM</h1>
          <h1 className="text-5xl font-bold text-white text-start">BARTR.</h1>
        </div>
      </div>
    </div>
  );
}
