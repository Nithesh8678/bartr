import { cn } from "@/lib/utils";
import React from "react";

export function GridSmallBackgroundDemo() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-black">
      {/* Linear gradient background */}
      <div className="absolute inset-0 bg-[#242FFF]"></div>
      {/* Grid pattern overlay */}
      <div
        className={cn(
          "absolute inset-0",
          "[background-size:10px_10px]",
          "[background-image:linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)]",
          "dark:[background-image:linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)]",
          "opacity-50"
        )}
      />
    </div>
  );
}
