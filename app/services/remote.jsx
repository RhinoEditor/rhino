/**
 * This service is responsible for communication with the "remote"
 * The "remote" is the electron main process. It has access to certain APIs
 * which need to be used in special ways by the renderer process.
 */

const url = require('url');
const path = require('path');

const {
  shell,
  ipcRenderer: ipc,
  remote: {dialog, BrowserWindow},
} = require('electron');

const {
  loadImage,
} = require('../actions/ImageActions');

const {
  ACTION_OPEN_FILE,
} = require('../actions/FileActions');

const {
  ACTION_MINIMIZE_WINDOW,
  ACTION_MAXIMIZE_WINDOW,
  ACTION_CLOSE_WINDOW,
  ACTION_RELOAD_WINDOW,
  ACTION_TOGGLE_DEVTOOLS,
  ACTION_TOGGLE_FULLSCREEN,
  ACTION_OPEN_URL,
  ACTION_SHOW_ABOUT_SCREEN,
} = require('../actions/WindowActions');

const actionHandlers = {
  [ACTION_MINIMIZE_WINDOW](win) {
    win.minimize();
  },

  [ACTION_MAXIMIZE_WINDOW](win) {
    if (win.isMaximized()) {
      win.unmaximize();
    }
    else {
      win.maximize();
    }
  },

  [ACTION_RELOAD_WINDOW](win) {
    win.reload();
  },

  [ACTION_TOGGLE_DEVTOOLS](win) {
    if (win.isDevToolsOpened()) {
      win.closeDevTools();
    }
    else {
      win.openDevTools();
    }
  },

  [ACTION_TOGGLE_FULLSCREEN](win) {
    win.setFullScreen(!win.isFullScreen());
  },

  [ACTION_CLOSE_WINDOW](win) {
    win.close();
  },

  [ACTION_OPEN_FILE](win, dispatch) {
    this.open(dispatch);
  },

  [ACTION_OPEN_URL](win, dispatch, {url}) {
    shell.openExternal(url);
  },

  [ACTION_SHOW_ABOUT_SCREEN](win) {
    const child = new BrowserWindow({
      parent: win,
      modal: true,
      show: false,
      frame: false,
      resizable: false,
      width: 480,
      height: 400,
    });
    child.setMenu(null);

    child.loadURL(url.format({
      protocol: 'file:',
      pathname: path.join(process.env.APP_ROOT, 'index.html'),
      hash: '#/about',
      slashes: true,
    }));

    child.once('ready-to-show', () => {
      child.show();
    });
  },
};

class Remote {
  constructor() {
  }

  start({dispatch}) {
    ipc.on('action', (event, action) => dispatch(action));
  }

  middleware() {
    return ({dispatch}) => next => action => {
      const handler = actionHandlers[action.type];

      if (handler) {
        const win = BrowserWindow.getFocusedWindow();

        handler.call(this, win, dispatch, action);
      }

      next(action);
    };
  }

  open(dispatch) {
    const supported = ['jpg', 'jpeg', 'png'];
    const files = dialog.showOpenDialog({
      title: 'Open Image',
      properties: ['openFile', 'createDirectory'],
      filters: [
        {name: `Image Files (${supported.map((e) => '*.' + e).join(', ')})`, extensions: supported},
        {name: 'All Files (*.*)', extensions: ['*']},
      ],
    });

    if (!files) {
      return;
    }

    const file = files[0];
    const filetype = path.extname(file).slice(1);
    if (supported.includes(filetype)) {
      dispatch(loadImage(file));
    }
    else {
      dialog.showErrorBox('Unsupported File Type',
        `The file extension '${filetype}' is not supported.`);
    }
  }
}

module.exports = Remote;
