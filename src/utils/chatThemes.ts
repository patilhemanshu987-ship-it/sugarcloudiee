export type ChatThemePreset = {
  key: string;
  label: string;
  myBubble: string;
  otherBubble: string;
  inputBg: string;
  inputBorder: string;
  headerBg: string;
  headerText: string;
  sendButton: string;
};

export const chatThemePresets: ChatThemePreset[] = [
  {
    key: 'classic',
    label: 'Classic',
    myBubble: '#1A73E8',
    otherBubble: '#E8EEF5',
    inputBg: '#FFFFFF',
    inputBorder: '#D5DEE8',
    headerBg: '#FFFFFF',
    headerText: '#16202A',
    sendButton: '#1A73E8',
  },
  {
    key: 'sunset',
    label: 'Sunset',
    myBubble: '#FF6A3D',
    otherBubble: '#FFE5D8',
    inputBg: '#FFF5EF',
    inputBorder: '#F6C4AE',
    headerBg: '#FFE0CF',
    headerText: '#3E1F14',
    sendButton: '#FF6A3D',
  },
  {
    key: 'aurora',
    label: 'Aurora',
    myBubble: '#7B61FF',
    otherBubble: '#EDE8FF',
    inputBg: '#F7F5FF',
    inputBorder: '#CBC1FF',
    headerBg: '#ECE7FF',
    headerText: '#251B55',
    sendButton: '#7B61FF',
  },
  {
    key: 'neon',
    label: 'Neon',
    myBubble: '#00D084',
    otherBubble: '#1C2A24',
    inputBg: '#101A15',
    inputBorder: '#2C4F3F',
    headerBg: '#0E1612',
    headerText: '#D9FFEF',
    sendButton: '#00D084',
  },
  {
    key: 'ocean',
    label: 'Ocean',
    myBubble: '#0086FF',
    otherBubble: '#D9EEFF',
    inputBg: '#EFF8FF',
    inputBorder: '#B9DBF8',
    headerBg: '#D9EEFF',
    headerText: '#0E3555',
    sendButton: '#0086FF',
  },
  {
    key: 'mono',
    label: 'Mono',
    myBubble: '#2B2B2B',
    otherBubble: '#ECECEC',
    inputBg: '#FFFFFF',
    inputBorder: '#CCCCCC',
    headerBg: '#F2F2F2',
    headerText: '#1C1C1C',
    sendButton: '#2B2B2B',
  },
];

export const getChatTheme = (key: string | null | undefined): ChatThemePreset => {
  return chatThemePresets.find((item) => item.key === key) || chatThemePresets[0];
};
