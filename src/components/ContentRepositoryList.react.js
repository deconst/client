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
    console.log("componentDidMount");
    ContentRepositoryStore.listen(this.update);
  },

  componentWillUnmount: function () {
    console.log("componentWillUnmount");
    ContentRepositoryStore.unlisten(this.update);
  },

  update: function (state) {
    console.log("update");
    this.setState(state);
  },

  render: function () {
    let orderedRepos = _.sortBy(_.values(this.state.repositories), r => r.id);

    let cards = orderedRepos.map(repo => {
      let k = "edit-" + repo.id;

      return (
        <li key={k}>
          <ContentRepositoryCard repository={repo} />
        </li>
      )
    });

    return (
      <div className="content-repository-list">
        <Header />
        <div className="container">
          <h1>Content Repositories</h1>
          <ul className="content-repositories">
            {cards}
            <li key="new-repository" className="add-content-repository">
              <Router.Link to="editRepository">New...</Router.Link>
            </li>
          </ul>
        </div>
      </div>
    );
  }
})

module.exports = ContentRepositoryList;
