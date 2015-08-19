import React from 'react/addons';
import Router from 'react-router';
import _ from 'underscore';
import Header from './Header.react';
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

    let cards = orderedRepos.map(repo => {
      return (
        <li key={repo.id}>
          <ContentRepositoryCard repository={repo} />
        </li>
      );
    });

    return (
      <div className="content-repository-list">
        <Header />
        <div className="container">
          <h1>Content Repositories</h1>
          <ul className="content-repositories">
            {cards}
          </ul>
          <div className="actions">
            <Router.Link to="editRepository" className="btn btn-primary">New</Router.Link>
          </div>
        </div>
      </div>
    );
  }
})

module.exports = ContentRepositoryList;
