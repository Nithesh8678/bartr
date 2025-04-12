"use client";

import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-white to-indigo-50">
      <motion.div className="flex flex-col items-center">
        {/* Simple BARTR logo animation */}
        <motion.div
          className="relative flex mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {["B", "A", "R", "T", "R"].map((letter, i) => (
            <motion.span
              key={i}
              className="text-4xl font-bold text-[#2A0EFF]"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                ease: "easeOut",
              }}
            >
              {letter}
            </motion.span>
          ))}
          <motion.span
            className="absolute -right-4 -top-1 text-4xl font-bold text-[#2A0EFF]"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          >
            .
          </motion.span>
        </motion.div>

        {/* Pulse circle animation */}
        <div className="relative mt-6">
          <motion.div
            className="w-12 h-12 rounded-full bg-[#2A0EFF]/10 absolute"
            animate={{
              scale: [1, 2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ left: "calc(50% - 24px)", top: "calc(50% - 24px)" }}
          />
          <motion.div
            className="w-8 h-8 rounded-full bg-[#2A0EFF]/20 absolute"
            animate={{
              scale: [1, 1.7, 1],
              opacity: [0.7, 0.1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
            style={{ left: "calc(50% - 16px)", top: "calc(50% - 16px)" }}
          />
          <motion.div
            className="w-4 h-4 rounded-full bg-[#2A0EFF] absolute"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ left: "calc(50% - 8px)", top: "calc(50% - 8px)" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
