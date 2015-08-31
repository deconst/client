// Modified from Kitematic by Ash Wilson

import app from 'app';
import autoUpdater from 'auto-updater';
import BrowserWindow from 'browser-window';
import fs from 'fs';
import os from 'os';
import ipc from 'ipc';
import path from 'path';
import child_process from 'child_process';

process.env.NODE_PATH = path.join(__dirname, 'node_modules');
process.env.RESOURCES_PATH = path.join(__dirname, '/../resources');
process.env.PATH = '/usr/local/bin:' + process.env.PATH;

var size = {}, settingsjson = {};
try {
  size = JSON.parse(fs.readFileSync(path.join(process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'], 'Library', 'Application\ Support', 'Kite-Shell', 'size')));
} catch (err) {}
try {
  settingsjson = JSON.parse(fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8'));
} catch (err) {}

let updateCmd = (args, cb) => {
  let updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  let child = child_process.spawn(updateExe, args, {detached: true});
  child.on('close', cb);
};

if (process.platform === 'win32') {
  var squirrelCommand = process.argv[1];
  let target = path.basename(process.execPath);
  switch (squirrelCommand) {
    case '--squirrel-install':
    case '--squirrel-updated':
      updateCmd(['--createShortcut', target], app.quit);
      break;
    case '--squirrel-uninstall':
      updateCmd(['--removeShortcut', target], app.quit);
      break;
    case '--squirrel-obsolete':
      app.quit();
      break;
  }
}

app.on('ready', function () {
  var mainWindow = new BrowserWindow({
    width: size.width || 600,
    height: size.height || 650,
    'min-width': os.platform() === 'win32' ? 400 : 600,
    'min-height': os.platform() === 'win32' ? 260 : 100,
    resizable: true,
    show: false
  });

  mainWindow.loadUrl(path.normalize('file://' + path.join(__dirname, 'index.html')));

  app.on('activate-with-no-open-windows', function () {
    if (mainWindow) {
      mainWindow.show();
    }
    return false;
  });

  var updating = false;
  ipc.on('application:quit-install', function () {
    updating = true;
    autoUpdater.quitAndInstall();
  });

  ipc.on('deconst:preparer-completion', function () {
    app.dock.bounce();
  });

  if (os.platform() === 'win32') {
    mainWindow.on('close', function () {
      mainWindow.webContents.send('application:quitting');
      return true;
    });
    app.on('window-all-closed', function() {
      app.quit();
    });
  } else if (os.platform() === 'darwin') {
    app.on('before-quit', function () {
      if (!updating) {
        mainWindow.webContents.send('application:quitting');
      }
    });
  }

  mainWindow.webContents.on('did-finish-load', function() {
    mainWindow.setTitle('Deconst');
    mainWindow.show();
    mainWindow.focus();

    if (process.env.NODE_ENV !== 'development') {
      // autoUpdater.setFeedUrl('https://updates.kitematic.com/releases/latest?version=' + app.getVersion() + '&beta=' + !!settingsjson.beta + '&platform=' + os.platform());
    }
  });

  autoUpdater.on('checking-for-update', function () {
    console.log('Checking for update...');
  });

  autoUpdater.on('update-available', function () {
    console.log('Update available.');
  });

  autoUpdater.on('update-not-available', function () {
    console.log('Update not available.');
  });

  autoUpdater.on('update-downloaded', function (e, releaseNotes, releaseName, releaseDate, updateURL) {
    console.log('Update downloaded.');
    console.log(releaseNotes, releaseName, releaseDate, updateURL);
    mainWindow.webContents.send('application:update-available');
  });

  autoUpdater.on('error', function (e, error) {
    console.log('An error occured while checking for updates.');
    console.log(error);
  });
});
