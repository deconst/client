import React from 'react/addons';
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

  handleEdit: function () {
    //
  },

  handleRemove: function() {
    //
  },

  render: function () {
    let repo = this.props.repository;
    let nameElement, detailElement, submitElement;

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
        <a classNames="btn btn-link" onClick={this.handleSubmit}>submit</a>
      );
    } else {
      submitElement = (
        <span>submit</span>
      );
    }

    if (repo.error) {
      detailElement = (
        <p className="detail">{repo.error}</p>
      );
    }

    return (
      <div className="content-repository-card">
        <div className="headline">
          {nameElement}
          <span className="state">{repo.state}</span>
          <ul className="controls">
            <li>{submitElement}</li>
            <li><a classNames="btn btn-link" onClick={this.handleEdit}>edit</a></li>
            <li><a classNames="btn btn-link" onClick={this.handleRemove}>remove</a></li>
          </ul>
        </div>
        {detailElement}
      </div>
    )
  }
})

module.exports = ContentRepositoryCard;
