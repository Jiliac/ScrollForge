import { makeWriteFile } from "./write-file";
import { makeEditFile } from "./edit-file";
import { makeSearchImage } from "./search-image";
import { makeCreateImage } from "./create-image";
import { twistOfFateTool } from "./twist-of-fate";

export function createTools(gameId: string) {
  return {
    write_file: makeWriteFile(gameId),
    edit_file: makeEditFile(gameId),
    search_image: makeSearchImage(gameId),
    create_image: makeCreateImage(gameId),
    twist_of_fate: twistOfFateTool,
  };
}

export function createFactionTools(gameId: string) {
  return {
    write_file: makeWriteFile(gameId),
    edit_file: makeEditFile(gameId),
    search_image: makeSearchImage(gameId),
    create_image: makeCreateImage(gameId),
  };
}

export function createWorldAdvanceTools(gameId: string) {
  return {
    write_file: makeWriteFile(gameId),
    edit_file: makeEditFile(gameId),
    search_image: makeSearchImage(gameId),
    create_image: makeCreateImage(gameId),
    twist_of_fate: twistOfFateTool,
  };
}

export function createArchivistTools(gameId: string) {
  return {
    write_file: makeWriteFile(gameId),
    edit_file: makeEditFile(gameId),
  };
}

export function createNarratorTools(gameId: string) {
  return {
    search_image: makeSearchImage(gameId),
    create_image: makeCreateImage(gameId),
    twist_of_fate: twistOfFateTool,
  };
}
