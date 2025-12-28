export { writeFileTool } from "./write-file";
export { editFileTool } from "./edit-file";
export { searchImageTool } from "./search-image";
export { createImageTool } from "./create-image";

import { writeFileTool } from "./write-file";
import { editFileTool } from "./edit-file";
import { searchImageTool } from "./search-image";
import { createImageTool } from "./create-image";

export const tools = {
  write_file: writeFileTool,
  edit_file: editFileTool,
  search_image: searchImageTool,
  create_image: createImageTool,
};
