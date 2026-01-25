export { writeFileTool } from "./write-file";
export { editFileTool } from "./edit-file";
export { searchImageTool } from "./search-image";
export { createImageTool } from "./create-image";
export { twistOfFateTool } from "./twist-of-fate";

import { writeFileTool } from "./write-file";
import { editFileTool } from "./edit-file";
import { searchImageTool } from "./search-image";
import { createImageTool } from "./create-image";
import { twistOfFateTool } from "./twist-of-fate";

export const tools = {
  write_file: writeFileTool,
  edit_file: editFileTool,
  search_image: searchImageTool,
  create_image: createImageTool,
  twist_of_fate: twistOfFateTool,
};

// Faction tools: no twist_of_fate (factions have agency, not randomness)
export const factionTools = {
  write_file: writeFileTool,
  edit_file: editFileTool,
  search_image: searchImageTool,
  create_image: createImageTool,
};

// World advance tools: includes twist_of_fate for thread resolution
export const worldAdvanceTools = {
  write_file: writeFileTool,
  edit_file: editFileTool,
  search_image: searchImageTool,
  create_image: createImageTool,
  twist_of_fate: twistOfFateTool,
};

// Archivist tools: only file operations, no dice or images
export const archivistTools = {
  write_file: writeFileTool,
  edit_file: editFileTool,
};

// Narrator tools: dice and images only, no file operations (archivist handles those)
export const narratorTools = {
  search_image: searchImageTool,
  create_image: createImageTool,
  twist_of_fate: twistOfFateTool,
};
