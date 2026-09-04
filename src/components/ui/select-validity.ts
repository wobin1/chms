export function messageForRequiredSelect(fieldLabel?: string) {
  if (fieldLabel?.trim()) {
    return `Choose a ${fieldLabel.trim()}.`;
  }
  return "Please select an option.";
}
