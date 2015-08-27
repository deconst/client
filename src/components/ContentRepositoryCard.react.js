import React from 'react/addons';
import Router from 'react-router';
import shell from 'shell';
import ContentRepositoryActions from '../actions/ContentRepositoryActions';

var ContentRepositoryCard = React.createClass({
  handlePreview: function () {
    shell.openExternal(this.props.repository.publicURL());
  },

  handleSubmit: function () {
    ContentRepositoryActions.prepareContent(this.props.repository);
    ContentRepositoryActions.prepareControl(this.props.repository);
  },

  handleRemove: function () {
    ContentRepositoryActions.remove(this.props.repository);
  },

  handleRetry: function () {
    ContentRepositoryActions.relaunch(this.props.repository);
  },

  render: function () {
    let repo = this.props.repository;
    let nameElement, detailElement, retryElement, submitElement;

    if (repo.canPreview()) {
      // Render the name as a link.
      nameElement = (
        <a className="preview" onClick={this.handlePreview}>{repo.name()}</a>
      );
    } else {
      // Use a span instead.
      nameElement = (
        <span className="preview">{repo.name()}</span>
      );
    }

    if (repo.canSubmit()) {
      submitElement = (
        <a className="btn btn-link" onClick={this.handleSubmit}>submit</a>
      );
    } else {
      submitElement = (
        <span>submit</span>
      );
    }

    if (repo.error) {
      detailElement = (
        <p className="detail error">{repo.error.toString()}</p>
      );

      retryElement = (
        <li><a className="btn btn-link" onClick={this.handleRetry}>retry</a></li>
      )
    }

    return (
      <div className="content-repository-card">
        <div className="headline">
          {nameElement}
          <span className="state">{repo.state}</span>
          <ul className="controls">
            {retryElement}
            <li>{submitElement}</li>
            <li><Router.Link to="editRepository" params={{id: repo.id}} className="btn btn-link">edit</Router.Link></li>
            <li><a className="btn btn-link" onClick={this.handleRemove}>remove</a></li>
          </ul>
        </div>
        {detailElement}
      </div>
    )
  }
})

module.exports = ContentRepositoryCard;
