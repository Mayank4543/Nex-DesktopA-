declare module 'react-syntax-highlighter' {
  import * as React from 'react';
  export const Prism: React.ComponentType<any>;
  export const SyntaxHighlighter: React.ComponentType<any>;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  const style: any;
  export default style;
  export const oneDark: any;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism/one-dark' {
  const style: any;
  export default style;
}
