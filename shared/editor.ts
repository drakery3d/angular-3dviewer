export interface EditorState {
  camera: {
    fov: number
  }
}

export const defaultState: EditorState = {
  camera: {
    fov: 50,
  },
}
