// Modified from Kitematic by Ash Wilson

require.main.paths.splice(0, 0, process.env.NODE_PATH);
import remote from 'remote';
var Menu = remote.require('menu');
import React from 'react';
import SetupStore from './stores/SetupStore';
import ipc from 'ipc';
import machine from './utils/DockerMachineUtil';
import template from './menutemplate';
import webUtil from './utils/WebUtil';
var app = remote.require('app');
import request from 'request';
import docker from './utils/DockerUtil';
import Router from 'react-router';
import routes from './routes';
import routerContainer from './router';

webUtil.addWindowSizeSaving();
webUtil.addLiveReload();
webUtil.disableGlobalBackspace();

Menu.setApplicationMenu(Menu.buildFromTemplate(template()));

var router = Router.create({
  routes: routes
});
router.run(Handler => React.render(<Handler/>, document.body));
routerContainer.set(router);

SetupStore.setup().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(template()));
  docker.init();
  router.transitionTo('repositoryList');
}).catch(err => {
  throw err;
});

ipc.on('application:quitting', () => {
  // if (localStorage.getItem('settings.closeVMOnQuit') === 'true') {
  //   machine.stop();
  // }
});

module.exports = {
  router: router
};
