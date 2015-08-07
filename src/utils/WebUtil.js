// Modified from Kitematic by Ash Wilson

import remote from 'remote';
var app = remote.require('app');
import fs from 'fs';
import util from './Util';
import path from 'path';

var WebUtil = {
  addWindowSizeSaving: function () {
    window.addEventListener('resize', function () {
      fs.writeFileSync(path.join(util.supportDir(), 'size'), JSON.stringify({
        width: window.outerWidth,
        height: window.outerHeight
      }));
    });
  },
  addLiveReload: function () {
    if (process.env.NODE_ENV === 'development') {
      var head = document.getElementsByTagName('head')[0];
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'http://localhost:35729/livereload.js';
      head.appendChild(script);
    }
  },
  disableGlobalBackspace: function () {
    document.onkeydown = function (e) {
      e = e || window.event;
      var doPrevent;
      if (e.keyCode === 8) {
        var d = e.srcElement || e.target;
        if (d.tagName.toUpperCase() === 'INPUT' || d.tagName.toUpperCase() === 'TEXTAREA') {
          doPrevent = d.readOnly || d.disabled;
        } else {
          doPrevent = true;
        }
      } else {
        doPrevent = false;
      }
      if (doPrevent) {
        e.preventDefault();
      }
    };
  },
};

module.exports = WebUtil;
