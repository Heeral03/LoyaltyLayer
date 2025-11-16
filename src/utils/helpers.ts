// src/utils/helpers.ts
export const getTierName = (tier: number): string => {
  switch(tier) {
    case 0: return "Basic";
    case 1: return "Premium"; 
    case 2: return "Enterprise";
    default: return "Basic";
  }
};

export const getTierColor = (tier: number): string => {
  switch(tier) {
    case 0: return "#6b7280"; // Gray for Basic
    case 1: return "#3b82f6"; // Blue for Premium
    case 2: return "#8b5cf6"; // Purple for Enterprise
    default: return "#6b7280";
  }
};