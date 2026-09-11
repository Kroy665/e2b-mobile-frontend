import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export interface TerminalViewHandle {
  write: (data: string) => void;
  clear: () => void;
}

interface TerminalViewProps {
  onInput: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

// xterm.js runs inside a WebView because it's the only practical way to get a
// real ANSI/VT100-capable terminal emulator (cursor movement, colors, in-place
// line redraws) in React Native — there is no native RN port of xterm, and a
// plain <Text> can only ever append raw bytes, not interpret escape codes.
const TERMINAL_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css" />
  <style>
    html, body { margin: 0; padding: 0; background: #0b0f19; height: 100%; overflow: hidden; }
    #terminal { height: 100%; padding: 4px; box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.js"></script>
  <script>
    const term = new Terminal({
      convertEol: true,
      fontSize: 13,
      fontFamily: 'Menlo, Courier, monospace',
      theme: {
        background: '#0b0f19',
        foreground: '#e5e7eb',
        cursor: '#22c55e',
      },
    });
    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(document.getElementById('terminal'));
    fitAddon.fit();

    function post(message) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }

    term.onData((data) => post({ type: 'input', data }));

    let resizeTimeout;
    function reportSize() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        fitAddon.fit();
        post({ type: 'resize', cols: term.cols, rows: term.rows });
      }, 50);
    }
    window.addEventListener('resize', reportSize);
    reportSize();

    // Called from React Native via injectJavaScript.
    window.writeToTerminal = function (data) {
      term.write(data);
    };
    window.clearTerminal = function () {
      term.clear();
    };

    post({ type: 'ready' });
  </script>
</body>
</html>
`;

export const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(function TerminalView(
  { onInput, onResize },
  ref,
) {
  const webviewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    write: (data: string) => {
      const encoded = JSON.stringify(data);
      webviewRef.current?.injectJavaScript(`window.writeToTerminal && window.writeToTerminal(${encoded}); true;`);
    },
    clear: () => {
      webviewRef.current?.injectJavaScript('window.clearTerminal && window.clearTerminal(); true;');
    },
  }));

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'input') {
        onInput(message.data);
      } else if (message.type === 'resize') {
        onResize(message.cols, message.rows);
      }
    } catch {
      // ignore malformed bridge messages
    }
  };

  return (
    <WebView
      ref={webviewRef}
      style={styles.webview}
      source={{ html: TERMINAL_HTML, baseUrl: 'https://localhost' }}
      originWhitelist={['*']}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      overScrollMode="never"
      bounces={false}
    />
  );
});

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: '#0b0f19' },
});
