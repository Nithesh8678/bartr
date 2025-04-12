import Image from "next/image";
import Link from "next/link";
import { GridSmallBackgroundDemo } from "@/components/GridSmallBackgroundDemo";
import { FlipWords } from "@/components/ui/flip-words";

export default function Home() {
  const words = ["WORK", "SKILL"];
  return (
    <div className="relative min-h-screen w-full bg-white overflow-hidden">
      {/* First section with hero content */}
      <section className="h-screen w-full flex flex-col items-center justify-start p-0">
        <div className="w-full h-auto m-0 p-0 flex items-center justify-center">
          <Image
            src="/herobg.jpg"
            alt="Bartr Platform"
            width={1920}
            height={1080}
            className="object-cover w-full h-auto"
            priority
          />
        </div>

        <div className="text-center mt-4 w-full justify-center items-center">
          <h1 className="text-5xl font-bold text-[#2A0EFF]">
            WORLD'S FIRST <FlipWords words={words} />
            EXCHANGE PLATFORM
          </h1>
          <h1 className="text-5xl font-bold text-[#2A0EFF] text-center w-full">
            BARTR.
          </h1>
        </div>
      </section>

      {/* Diagonal marquee section */}
      <section className="h-screen w-full relative overflow-hidden">
        <div className="w-full h-full relative">
          {/* Second image positioned in the middle */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Image
              src="/hero2o.png"
              alt="Bartr Features"
              width={600}
              height={500}
              className="object-cover shadow-xl rounded-lg"
            />
          </div>

          {/* Bottom-left to top-right marquee */}
          <div className="absolute z-0 -left-1/3 right-[-33%] bottom-0 h-32 bg-[#2A0EFF] overflow-hidden diagonal-up">
            <div className="whitespace-nowrap marquee-left inline-block">
              <span className="text-white text-2xl font-bold mx-4">
                DO WHAT YOU LOVE
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
              <span className="text-white text-2xl font-bold mx-4">
                GET WHAT YOU NEED
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
              <span className="text-white text-2xl font-bold mx-4">
                CONNECT WITH EXPERTS
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
            </div>
            <div className="whitespace-nowrap marquee-right inline-block absolute left-0">
              <span className="text-white text-2xl font-bold mx-4">
                DO WHAT YOU LOVE
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
              <span className="text-white text-2xl font-bold mx-4">
                EXCHANGE VALUE
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
              <span className="text-white text-2xl font-bold mx-4">
                GET WHAT YOU NEED
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
            </div>
          </div>

          {/* Top-left to bottom-right marquee */}
          <div className="absolute z-0 -left-1/3 right-[-33%] top-20 h-32 bg-[#2A0EFF] overflow-hidden diagonal-down">
            <div className="whitespace-nowrap marquee-left inline-block">
              <span className="text-white text-2xl font-bold mx-4">
                DO WHAT YOU LOVE
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
              <span className="text-white text-2xl font-bold mx-4">
                GET WHAT YOU NEED
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
              <span className="text-white text-2xl font-bold mx-4">
                GROW YOUR SKILLS
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
            </div>
            <div className="whitespace-nowrap marquee-right inline-block absolute left-0">
              <span className="text-white text-2xl font-bold mx-4">
                DO WHAT YOU LOVE
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
              <span className="text-white text-2xl font-bold mx-4">
                GET WHAT YOU NEED
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
              <span className="text-white text-2xl font-bold mx-4">
                GROW YOUR SKILLS
              </span>
              <span className="text-white text-2xl font-bold mx-4">•</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
