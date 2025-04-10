"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [tempSkill, setTempSkill] = useState("");

  const addSkill = () => {
    if (tempSkill.trim() && !skills.includes(tempSkill.trim())) {
      setSkills([...skills, tempSkill.trim()]);
      setTempSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  return (
    <div>
      <Label htmlFor={label.toLowerCase().replace(/\s/g, "-")}>{label}</Label>
      <div className="flex space-x-2">
        <Input
          id={label.toLowerCase().replace(/\s/g, "-")}
          value={tempSkill}
          onChange={(e) => setTempSkill(e.target.value)}
          placeholder={`Add ${label.toLowerCase()}`}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
        />
        <Button type="button" onClick={addSkill} size="sm">
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {skills.map((skill) => (
          <div
            key={skill}
            className={`flex items-center ${backgroundColor} ${textColor} px-3 py-1 rounded-full text-sm`}
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className={`ml-2 ${textColor}/80 hover:${textColor}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
