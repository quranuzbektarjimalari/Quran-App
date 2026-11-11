const { webFrame } = require('electron');
// Ctrl+g'ildirak bilan zoom'ni ilovaning o'zi boshqaradi; Chromium zoom'i xalaqit bermasin
webFrame.setVisualZoomLevelLimits(1, 1);
