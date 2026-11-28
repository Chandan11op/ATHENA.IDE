/// <reference types="vite/client" />

declare module 'monaco-editor/editor/editor.worker?worker' {
  const worker: { new (): Worker };
  export default worker;
}
declare module 'monaco-editor/language/json/json.worker?worker' {
  const worker: { new (): Worker };
  export default worker;
}
declare module 'monaco-editor/language/css/css.worker?worker' {
  const worker: { new (): Worker };
  export default worker;
}
declare module 'monaco-editor/language/html/html.worker?worker' {
  const worker: { new (): Worker };
  export default worker;
}
declare module 'monaco-editor/language/typescript/ts.worker?worker' {
  const worker: { new (): Worker };
  export default worker;
}
