import React from 'react/addons';
import Router from 'react-router';
import Header from './Header.react';
import ContentRepositoryActions from '../actions/ContentRepositoryActions';

var EditContentRepository = React.createClass({
  mixins: [Router.Navigation],

  handleRepositoryPathChange: function (e) {
    this.contentRepositoryPath = e.target.value;
  },

  handleControlRepositoryChange: function (e) {
    this.controlRepositoryLocation = e.target.value;
  },

  handleCancel: function () {
    this.transitionTo("repositoryList");
  },

  handleCreate: function () {
    ContentRepositoryActions.launch(this.controlRepositoryLocation, this.contentRepositoryPath);

    this.transitionTo("repositoryList");
  },

  render: function () {
    return (
      <div className="edit-content-repository">
        <Header />
        <div className="container">
          <h1>New Content Repository</h1>
          <div className="repository-path">
            <h3>Repository Path</h3>
            <p className="explanation">Filesystem path to the content repository.</p>
            <input id="input-repository-path" type="text" className="line" placeholder="/some/path" onChange={this.handleRepositoryPathChange}></input>
          </div>
          <div className="control-repository">
            <h3>Control Repository Location</h3>
            <p className="explanation">
              Location of the control repository. May be either a git URL or a local filesystem path.
            </p>
            <input id="control-repository" type="text" className="line" placeholder="https://github.com/deconst/deconst-docs-control.git" onChange={this.handleControlRepositoryChange}></input>
          </div>
          <div className="controls">
            <button className="btn btn-large btn-default" onClick={this.handleCancel}>Cancel</button>
            <button className="btn btn-large btn-primary" onClick={this.handleCreate}>Create</button>
          </div>
        </div>
      </div>
    )
  }
});

module.exports = EditContentRepository;
