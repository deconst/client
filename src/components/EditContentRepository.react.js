import path from 'path';
import React from 'react/addons';
import Router from 'react-router';
import remote from 'remote';
import _ from 'underscore';

var dialog = remote.require('dialog');

import {
  ContentRepository,
  validateContentRepository,
  readMaps,
  availableTemplates
} from '../utils/ContentRepositoryUtil';
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
      isMapped: false,
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
      let hasDisplay = this.state.displayName !== null;
      let hasContent = this.state.contentRepositoryPath !== null;
      let hasControl = this.state.controlRepositoryLocation !== null;

      validateContentRepository(this.state, (err, results) => {
        if (err) {
          console.error(err);
          return;
        }

        let validationErrorCount = Object.keys(results).reduce((sum, k) => sum + results[k].length, 0);

        let canCreate = validationErrorCount === 0 && hasDisplay && hasContent && hasControl;

        this.setState({validationErrors: results, canCreate});
      });

      if (hasContent && hasControl) {
        readMaps(this.state.contentRepositoryPath, this.state.controlRepositoryLocation, (err, results) => {
          if (err) {
            console.error(err);
            return;
          }

          this.setState({isMapped: results.isMapped});

          if (!results.isMapped) {
            availableTemplates(this.state.controlRepositoryLocation, results.site, (err, templateOptions) => {
              if (err) {
                console.error(err);
                return;
              }

              let results = {templateOptions};
              let needsReset = false;

              if (this.state.template) {
                needsReset = ! _.contains(templateOptions, this.state.template);
              }

              if (! this.state.template || needsReset) {
                let choice = _.find(templateOptions, (each) => /default/.test(each))
                if (choice === undefined && templateOptions.length > 0) {
                  choice = templateOptions[0];
                }
                results.template = choice;
              }

              this.setState(results);
            });
          }
        });
      }
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
        this.state.preparer,
        this.state.template
      );
    } else {
      ContentRepositoryActions.edit(
        this.props.params.id,
        displayName,
        this.state.controlRepositoryLocation,
        this.state.contentRepositoryPath,
        this.state.preparer,
        this.state.template
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

    let templateExplanation, templateDisable, templateOptions;
    if (this.state.isMapped) {
      templateExplanation = "Your content is mapped in the control repository, so no manual template selection is necessary.";
      templateDisable = true;
    } else if (this.state.templateOptions.length === 0) {
      templateExplanation = "No templates to choose from, yet. Please specify both a control and content repository.";
      templateDisable = true;
    } else {
      templateExplanation = "Template to use while rendering this unmapped content.";
      templateDisable = false;
      templateOptions = this.state.templateOptions.map((tpath) => {
        return <option key={tpath} value={tpath}>{tpath}</option>;
      });
    }

    let templateSection = this.renderSection("template", "template", (
      <div>
        <h3>Template</h3>
        <p className="explanation">{templateExplanation}</p>
        <select value={this.state.template} onChange={this.handleTemplateChange} disabled={templateDisable}>
          {templateOptions}
        </select>
      </div>
    ));

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
