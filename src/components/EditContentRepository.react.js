import path from 'path';
import React from 'react/addons';
import Router from 'react-router';
import remote from 'remote';

var dialog = remote.require('dialog');

import {ContentRepository, validateContentRepository, readMaps} from '../utils/ContentRepositoryUtil';
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
      preparer: "sphinx",
      canCreate: false,
      isMapped: true,
      template: null,
      templateOptions: [],
      validationErrors: {
        displayName: [],
        controlRepositoryLocation: [],
        contentRepositoryPath: []
      },
    };
  },

  componentDidMount: function () {
    let id = this.props.params.id;

    if (id !== undefined) {
      let repo = ContentRepositoryStore.getState().repositories[id];

      this.setState({
        isNew: false,
        manualDisplayName: !! repo.displayName,
        displayName: repo.name(),
        contentRepositoryPath: repo.contentRepositoryPath,
        controlRepositoryLocation: repo.controlRepositoryLocation,
        preparer: repo.preparer
      });
    }
  },

  revalidate: function (nstate) {
    this.setState(nstate, () => {
      validateContentRepository(this.state, (err, results) => {
        if (err) {
          console.error(err);
          return;
        }

        let validationErrorCount = Object.keys(results).reduce((sum, k) => sum + results[k].length, 0);

        let canCreate = validationErrorCount === 0 &&
          this.state.displayName !== null &&
          this.state.contentRepositoryPath !== null &&
          this.state.controlRepositoryLocation !== null;

        this.setState({validationErrors: results, canCreate});
      });

      readMaps(this.state.contentRepositoryPath, this.state.controlRepositoryLocation, (err, results) => {
        if (err) {
          console.error(err);
          return;
        }

        this.setState({isMapped: results.isMapped});
      });

      availableTemplates(this.state.controlRepositoryLocation, (err, templateOptions) => {
        if (err) {
          console.error(err);
          return;
        }

        this.setState({templateOptions});
      });
    });
  },

  updateContentRepository: function (repoPath) {
    let nstate = {contentRepositoryPath: repoPath};

    if (!this.state.manualDisplayName) {
      nstate.displayName = path.basename(nstate.contentRepositoryPath);
    }

    this.revalidate(nstate);
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
      this.revalidate({controlRepositoryLocation: results[0]});
    }
  },

  handleDisplayNameChange: function (e) {
    this.revalidate({
      manualDisplayName: true,
      displayName: e.target.value
    });
  },

  handleRepositoryPathChange: function (e) {
    this.updateContentRepository(e.target.value);
  },

  handleControlRepositoryChange: function (e) {
    this.revalidate({controlRepositoryLocation: e.target.value});
  },

  handlePreparerChange: function (e) {
    this.revalidate({preparer: e.target.value});
  },

  handleTemplateChange: function (e) {
    this.revalidate({template: e.target.value});
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

    let displayNameSection = this.renderSection("displayName", "display-name", (
      <div>
        <h3>Display Name</h3>
        <p className="explanation">Name that will appear in the repository list in this app.</p>
        <input type="text" className="line" value={this.state.displayName} placeholder="derived from content repository path" onChange={this.handleDisplayNameChange}></input>
      </div>
    ));

    let repositoryPathSection = this.renderSection("contentRepositoryPath", "content-repository-path", (
      <div>
        <h3>Content Repository Path</h3>
        <p className="explanation">Filesystem path to the content repository.</p>
        <input type="text" className="line fs-path" value={this.state.contentRepositoryPath} placeholder="/some/path" onChange={this.handleRepositoryPathChange}></input>
        <button className="btn btn-default btn-sm browse" onClick={this.handleOpenContent}>browse</button>
      </div>
    ));

    let controlRepositorySection = this.renderSection("controlRepositoryLocation", "control-repository-location", (
      <div>
        <h3>Control Repository Location</h3>
        <p className="explanation">Filesystem path to the control repository.</p>
        <input type="text" className="line fs-path" value={this.state.controlRepositoryLocation} placeholder="https://github.com/deconst/deconst-docs-control.git" onChange={this.handleControlRepositoryChange}></input>
        <button className="btn btn-default btn-sm browse" onClick={this.handleOpenControl}>browse</button>
      </div>
    ));

    let preparerSection = this.renderSection("preparer", "preparer", (
      <div>
        <h3>Preparer</h3>
        <p className="explanation">Preparer to use to prepare the content.</p>
        <select value={this.state.preparer} onChange={this.handlePreparerChange}>
          <option value="sphinx">Sphinx</option>
          <option value="jekyll">Jekyll</option>
        </select>
      </div>
    ));

    let templateSection;
    if (! this.state.isMapped) {
      templateSection = this.renderSection("template", "template", (
        <div>
          <h3>Template</h3>
          <p className="explanation">Template to use while rendering this unmapped content.</p>
          <select value={this.state.template} onChange={this.handleTemplateChange}>
            {this.state.templateOptions.map((tpath) => {
              <option key={tpath} value={tpath}>{tpath}</option>
            })}
          </select>
        </div>
      ));
    };

    return (
      <div className="edit-content-repository">
        <div className="container">
          <h1>{banner}</h1>
          {displayNameSection}
          {repositoryPathSection}
          {controlRepositorySection}
          {preparerSection}
          {templateSection}
          <div className="controls">
            <button className="btn btn-large btn-default" onClick={this.handleCancel}>Cancel</button>
            <button className="btn btn-large btn-primary" onClick={this.handleCommit} disabled={! this.state.canCreate}>{commit}</button>
          </div>
        </div>
      </div>
    )
  },

  renderSection: function (componentName, className, inner) {
    let errorMessages = this.state.validationErrors[componentName] || [];
    let klasses = className;
    let errorElement;

    if (errorMessages.length > 0) {
      klasses = `${klasses} with-errors`;

      errorElement = (
        <div className="validation-errors">{errorMessages.join(" ")}</div>
      );
    }

    return (
      <div className={klasses}>
        {inner}
        {errorElement}
      </div>
    )
  }
});

module.exports = EditContentRepository;
