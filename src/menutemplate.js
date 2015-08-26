// Modified from Kitematic by Ash Wilson

var remote = require('remote');
var app = remote.require('app');
var shell = require('shell');
var router = require('./router');
var util = require('./utils/Util');
var setupUtil = require('./utils/SetupUtil');
var machine = require('./utils/DockerMachineUtil');
var dialog = remote.require('dialog');
import docker from './utils/DockerUtil';

// main.js
var MenuTemplate = function () {
  return [
    {
      label: 'Deconst Client',
      submenu: [
      {
        label: 'About Deconst Client',
        click: function () {
          router.get().transitionTo('about');
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: util.CommandOrCtrl() + '+Q',
        click: function() {
          app.quit();
        }
      }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { label: "Undo", accelerator: util.CommandOrCtrl() + "+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+" + util.CommandOrCtrl() + "+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: util.CommandOrCtrl() + "+X", selector: "cut:" },
        { label: "Copy", accelerator: util.CommandOrCtrl() + "+C", selector: "copy:" },
        { label: "Paste", accelerator: util.CommandOrCtrl() + "+V", selector: "paste:" },
        { label: "Select All", accelerator: util.CommandOrCtrl() + "+A", selector: "selectAll:" }
      ]
    },
    {
      label: 'Window',
      submenu: [
      {
        label: 'Minimize',
        accelerator: util.CommandOrCtrl() + '+M',
        selector: 'performMiniaturize:'
      },
      {
        label: 'Close',
        accelerator: util.CommandOrCtrl() + '+W',
        click: function () {
          remote.getCurrentWindow().hide();
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Toggle DevTools',
        accelerator: 'Alt+' + util.CommandOrCtrl() + '+I',
        click: function() { remote.getCurrentWindow().toggleDevTools(); }
      }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Report Issue or Suggest Feedback',
          click: function () {
            shell.openExternal('https://github.com/deconst/deconst-docs/issues/new');
          }
        }
      ]
    }
  ];
};

module.exports = MenuTemplate;
