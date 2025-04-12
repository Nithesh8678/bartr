"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface SkillsInputProps {
  label: string;
  skills: string[];
  setSkills: (skills: string[]) => void;
  backgroundColor?: string;
  textColor?: string;
}

export default function SkillsInput({
  label,
  skills,
  setSkills,
  backgroundColor = "bg-primary/10",
  textColor = "text-primary",
}: SkillsInputProps) {
  const [newSkill, setNewSkill] = useState("");

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill();
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a skill and press Enter"
          className="flex-1 text-black"
        />
        <Button
          type="button"
          onClick={handleAddSkill}
          disabled={!newSkill.trim()}
        >
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {skills.map((skill, index) => (
          <span
            key={index}
            className={`px-3 py-1 rounded-full text-sm font-medium ${backgroundColor} ${textColor} flex items-center gap-1`}
          >
            {skill}
            <button
              type="button"
              onClick={() => handleRemoveSkill(skill)}
              className="hover:text-red-500"
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
