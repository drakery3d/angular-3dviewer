export interface EditorState {
  camera: {
    fov: number

    position?: {
      x: number
      y: number
      z: number
    }
    target?: {
      x: number
      y: number
      z: number
    }
  }
}

export const defaultState: EditorState = {
  camera: {
    fov: 50,
  },
}
