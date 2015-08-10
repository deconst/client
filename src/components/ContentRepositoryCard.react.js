import React from 'react/addons';

var ContentRepositoryCard = React.createClass({
  render: function () {
    let repo = this.props.repository;

    return (
      <div className="content-repository-card">
        <h2>{repo.name}</h2>
        <div className="details">
          <p className="content-path">{repo.path}</p>
          <p className="content-preview">
            <span className="status">{repo.status}</span>
            <a className="preview" href="#">preview</a>
          </p>
        </div>
        <div className="controls">
          <a href="#">edit</a>
          <a href="#">remove</a>
        </div>
      </div>
    )
  }
})

module.exports = ContentRepositoryCard;
