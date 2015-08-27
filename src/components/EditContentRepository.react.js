import path from 'path';
import React from 'react/addons';
import Router from 'react-router';
import remote from 'remote';

var dialog = remote.require('dialog');

import {ContentRepository} from '../utils/ContentRepositoryUtil';
import ContentRepositoryActions from '../actions/ContentRepositoryActions';
import ContentRepositoryStore from '../stores/ContentRepositoryStore';

var lastControlRepository = null;

var EditContentRepository = React.createClass({
  mixins: [Router.Navigation],

  getInitialState: function () {
    return {
      isNew: true,
      manualDisplayName: false,
      displayName: null,
      contentRepositoryPath: null,
      controlRepositoryLocation: lastControlRepository,
      preparer: "sphinx"
    };
  },

  componentDidMount: function () {
    let id = this.props.params.id;

    if (id !== undefined) {
      let repo = ContentRepositoryStore.getState().repositories[id];

      this.setState({
        isNew: false,
        displayName: repo.displayName,
        contentRepositoryPath: repo.contentRepositoryPath,
        controlRepositoryLocation: repo.controlRepositoryLocation,
        preparer: repo.preparer
      });
    }
  },

  updateContentRepository: function (repoPath) {
    let nstate = {contentRepositoryPath: repoPath};

    if (!this.state.manualDisplayName) {
      nstate.displayName = path.basename(nstate.contentRepositoryPath);
    }

    this.setState(nstate);
  },

  handleOpenContent: function() {
    let results = dialog.showOpenDialog({
      title: 'Content Repository',
      properties: ['openDirectory']
    });

    if (results && results.length > 0) {
      this.updateContentRepository(results[0]);
    }
  },

  handleOpenControl: function () {
    let results = dialog.showOpenDialog({
      title: 'Control Repository',
      properties: ['openDirectory']
    });

    if (results && results.length > 0) {
      this.setState({controlRepositoryLocation: results[0]});
    }
  },

  handleDisplayNameChange: function (e) {
    this.setState({
      manualDisplayName: true,
      displayName: e.target.value
    });
  },

  handleRepositoryPathChange: function (e) {
    this.updateContentRepository(e.target.value);
  },

  handleControlRepositoryChange: function (e) {
    this.setState({controlRepositoryLocation: e.target.value});
  },

  handlePreparerChange: function (e) {
    this.setState({preparer: e.target.value});
  },

  handleCancel: function () {
    this.transitionTo("repositoryList");
  },

  // "Create" or "Save"
  handleCommit: function () {
    let displayName = this.state.manualDisplayName ? this.state.displayName : null;

    if (this.state.isNew) {
      ContentRepositoryActions.launch(
        null,
        displayName,
        this.state.controlRepositoryLocation,
        this.state.contentRepositoryPath,
        this.state.preparer
      );
    } else {
      ContentRepositoryActions.edit(
        this.props.params.id,
        displayName,
        this.state.controlRepositoryLocation,
        this.state.contentRepositoryPath,
        this.state.preparer
      );
    }

    this.transitionTo("repositoryList");
  },

  render: function () {
    lastControlRepository = this.state.controlRepositoryLocation;

    let banner = this.state.isNew ? "Add a Content Repository" : "Edit the Content Repository";
    let commit = this.state.isNew ? "Create" : "Save";

    return (
      <div className="edit-content-repository">
        <div className="container">
          <h1>{banner}</h1>
          <div className="display-name">
            <h3>Display Name</h3>
            <p className="explanation">Name that will appear in the repository list in this app.</p>
            <input type="text" className="line" value={this.state.displayName} onChange={this.handleDisplayNameChange}></input>
          </div>
          <div className="repository-path">
            <h3>Content Repository Path</h3>
            <p className="explanation">Filesystem path to the content repository.</p>
            <input type="text" className="line fs-path" value={this.state.contentRepositoryPath} placeholder="/some/path" onChange={this.handleRepositoryPathChange}></input>
            <button className="btn btn-default btn-sm browse" onClick={this.handleOpenContent}>browse</button>
          </div>
          <div className="control-repository">
            <h3>Control Repository Location</h3>
            <p className="explanation">
              Location of the control repository. May be either a git URL or a local filesystem path.
            </p>
            <input type="text" className="line fs-path" value={this.state.controlRepositoryLocation} placeholder="https://github.com/deconst/deconst-docs-control.git" onChange={this.handleControlRepositoryChange}></input>
            <button className="btn btn-default btn-sm browse" onClick={this.handleOpenControl}>browse</button>
          </div>
          <div className="preparer">
            <h3>Preparer</h3>
            <p className="explanation">Preparer to use to prepare the content.</p>
            <select value={this.state.preparer} onChange={this.handlePreparerChange}>
              <option value="sphinx">Sphinx</option>
              <option value="jekyll">Jekyll</option>
            </select>
          </div>
          <div className="controls">
            <button className="btn btn-large btn-default" onClick={this.handleCancel}>Cancel</button>
            <button className="btn btn-large btn-primary" onClick={this.handleCommit}>{commit}</button>
          </div>
        </div>
      </div>
    )
  }
});

module.exports = EditContentRepository;
