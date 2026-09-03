"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  FAMILY_RELATIONSHIP_OTHER,
  FAMILY_RELATIONSHIP_PRESETS,
  type FamilyRelationshipSelection,
} from "@/features/families/relationship";

export function RelationshipSelect({
  id,
  preset,
  otherText,
  onPresetChange,
  onOtherTextChange,
  required,
  disabled,
}: {
  id?: string;
  preset: FamilyRelationshipSelection;
  otherText: string;
  onPresetChange: (preset: FamilyRelationshipSelection) => void;
  onOtherTextChange: (text: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  const otherId = id ? `${id}-other` : undefined;

  return (
    <div className="space-y-2">
      <Select
        id={id}
        value={preset}
        required={required}
        disabled={disabled}
        placeholder="Select relationship"
        onChange={(event) =>
          onPresetChange(event.target.value as FamilyRelationshipSelection)
        }
      >
        <option value="">Select relationship</option>
        {FAMILY_RELATIONSHIP_PRESETS.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
        <option value={FAMILY_RELATIONSHIP_OTHER}>
          {FAMILY_RELATIONSHIP_OTHER}
        </option>
      </Select>
      {preset === FAMILY_RELATIONSHIP_OTHER ? (
        <div>
          <Label htmlFor={otherId}>Other relationship</Label>
          <Input
            id={otherId}
            value={otherText}
            onChange={(event) => onOtherTextChange(event.target.value)}
            placeholder="Uncle, grandparent, or other"
            required={required}
            disabled={disabled}
          />
        </div>
      ) : null}
    </div>
  );
}
