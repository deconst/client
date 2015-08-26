import React from 'react/addons';
import Router from 'react-router';
import _ from 'underscore';
import ContentRepositoryCard from './ContentRepositoryCard.react';
import ContentRepositoryStore from '../stores/ContentRepositoryStore';

var ContentRepositoryList = React.createClass({
  getInitialState: function () {
    return ContentRepositoryStore.getState();
  },

  componentDidMount: function () {
    ContentRepositoryStore.listen(this.update);
  },

  componentWillUnmount: function () {
    ContentRepositoryStore.unlisten(this.update);
  },

  update: function (state) {
    this.setState(state);
  },

  render: function () {
    let orderedRepos = _.sortBy(_.values(this.state.repositories), r => r.id);
    let body;

    if (orderedRepos.length > 0) {
      let cards = orderedRepos.map(repo => {
        return (
          <li key={repo.id}>
            <ContentRepositoryCard repository={repo} />
          </li>
        );
      });

      body = (
        <ul className="content-repositories">
          {cards}
        </ul>
      )
    } else {
      body = (
        <div className="empty">
          <h2>Hi!</h2>
          <p className="explanation">
            What would you like me to render for you today? Add a content repository to start
            previewing your writing.
          </p>
        </div>
      )
    }

    return (
      <div className="content-repository-list container">
        {body}
        <div className="actions">
          <Router.Link to="newRepository" className="btn btn-primary">New</Router.Link>
        </div>
      </div>
    );
  }
})

module.exports = ContentRepositoryList;
