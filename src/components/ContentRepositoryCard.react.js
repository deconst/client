import React from 'react/addons';
import shell from 'shell';

var ContentRepositoryCard = React.createClass({
  handlePreview: function () {
    shell.openExternal(this.props.repository.publicURL());
  },

  render: function () {
    let repo = this.props.repository;

    return (
      <div className="content-repository-card">
        <h2>{repo.name()}</h2>
        <div className="details">
          <p className="content-path">{repo.contentRepositoryPath}</p>
          <p className="content-preview">
            <span className="state">{repo.state}</span>
            <a className="preview" onClick={this.handlePreview}>{repo.publicURL()}</a>
          </p>
          <p className="error">
            {repo.error}
          </p>
        </div>
        <ul className="controls">
          <li><a href="#">edit</a></li>
          <li><a href="#">remove</a></li>
        </ul>
      </div>
    )
  }
})

module.exports = ContentRepositoryCard;
