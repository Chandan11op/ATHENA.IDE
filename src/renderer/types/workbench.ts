export type ActivityView = 'explorer' | 'search' | 'git' | 'run' | 'extensions' | 'ai';

export type BottomPanelTab = 'terminal' | 'problems' | 'output' | 'debug';

export interface EditorTab {
  id: string;
  title: string;
  path: string;
  kind: 'welcome' | 'code' | 'preview' | 'diff';
  language?: string;
  content?: string;
  savedContent?: string;
  diffOriginal?: string;
  diffModified?: string;
  cursorLine?: number;
  cursorColumn?: number;
}

export const WELCOME_TAB: EditorTab = {
  id: 'welcome',
  title: 'Welcome',
  path: 'Athena.IDE / Welcome',
  kind: 'welcome',
};
