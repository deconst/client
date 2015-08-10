// Modified from Kitematic by Ash Wilson

import React from 'react/addons';
import remote from 'remote';
import RetinaImage from 'react-retina-image';
import ipc from 'ipc';
var autoUpdater = remote.require('auto-updater');
import util from '../utils/Util';
var Menu = remote.require('menu');
var MenuItem = remote.require('menu-item');
import Router from 'react-router';
import classNames from 'classnames';

var Header = React.createClass({
  mixins: [Router.Navigation],
  getInitialState: function () {
    return {
      fullscreen: false,
      updateAvailable: false
    };
  },
  componentDidMount: function () {
    document.addEventListener('keyup', this.handleDocumentKeyUp, false);

    ipc.on('application:update-available', () => {
      this.setState({
        updateAvailable: true
      });
    });
    autoUpdater.checkForUpdates();
  },
  componentWillUnmount: function () {
    document.removeEventListener('keyup', this.handleDocumentKeyUp, false);
  },
  handleDocumentKeyUp: function (e) {
    if (e.keyCode === 27 && remote.getCurrentWindow().isFullScreen()) {
      remote.getCurrentWindow().setFullScreen(false);
      this.forceUpdate();
    }
  },
  handleClose: function () {
    console.log("Close button clicked");
    if (util.isWindows()) {
      remote.getCurrentWindow().close();
    } else {
      remote.getCurrentWindow().hide();
    }
  },
  handleMinimize: function () {
    remote.getCurrentWindow().minimize();
  },
  handleFullscreen: function () {
    if (util.isWindows()) {
      if (remote.getCurrentWindow().isMaximized()) {
        remote.getCurrentWindow().unmaximize();
      } else {
        remote.getCurrentWindow().maximize();
      }
      this.setState({
        fullscreen: remote.getCurrentWindow().isMaximized()
      });
    } else {
      remote.getCurrentWindow().setFullScreen(!remote.getCurrentWindow().isFullScreen());
      this.setState({
        fullscreen: remote.getCurrentWindow().isFullScreen()
      });
    }
  },
  handleAutoUpdateClick: function () {
    ipc.send('application:quit-install');
  },
  renderLogo: function () {
    return (
      <div className="logo">
        DECONST
      </div>
    );
  },
  renderWindowButtons: function () {
    let buttons;
    if (util.isWindows()) {
      buttons = (
        <div className="windows-buttons">
        <div className="windows-button button-minimize enabled" onClick={this.handleMinimize}><div className="icon"></div></div>
        <div className={`windows-button ${this.state.fullscreen ? 'button-fullscreenclose' : 'button-fullscreen'} enabled`} onClick={this.handleFullscreen}><div className="icon"></div></div>
        <div className="windows-button button-close enabled" onClick={this.handleClose}></div>
        </div>
      );
    } else {
      buttons = (
        <div className="buttons">
          <span className="button button-close enabled" onClick={this.handleClose}>X</span>
          <span className="button button-minimize enabled" onClick={this.handleMinimize}>_</span>
          <span className="button button-fullscreen enabled" onClick={this.handleFullscreen}>[]</span>
        </div>
      );
    }
    return buttons;
  },
  renderDashboardHeader: function () {
    let updateWidget = this.state.updateAvailable ? <a className="btn btn-action small no-drag" onClick={this.handleAutoUpdateClick}>UPDATE NOW</a> : null;
    return (
      <div className="bordered header">
        <div className="left-header">
          {util.isWindows () ? this.renderLogo() : this.renderWindowButtons()}
        </div>
        <div className="right-header">
          <div className="updates">
            {updateWidget}
          </div>
          {util.isWindows () ? this.renderWindowButtons() : this.renderLogo()}
        </div>
      </div>
    );
  },
  renderBasicHeader: function () {
    return (
      <div className="bordered header">
        <div className="left-header">
          {util.isWindows () ? null : this.renderWindowButtons()}
        </div>
        <div className="right-header">
          {util.isWindows () ? this.renderWindowButtons() : null}
        </div>
      </div>
    );
  },
  render: function () {
    if (this.props.hideLogin) {
      return this.renderBasicHeader();
    } else {
      return this.renderDashboardHeader();
    }
  }
});

module.exports = Header;
