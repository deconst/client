import React from 'react/addons';
import Router from 'react-router';
import Header from './Header.react';
import ContentRepositoryCard from './ContentRepositoryCard.react';

var ContentRepositoryList = React.createClass({
  getInitialState: function () {
    return {
      repositories: [
        {
          name: 'docs-developer-blog',
          path: '/Users/ashl6947/writing/docs-developer-blog',
          status: 'ready'
        },
        {
          name: 'docs-quickstart',
          path: '/Users/ashl6947/writing/docs-quickstart',
          status: '...'
        }
      ],
    }
  },

  render: function () {
    let cards = this.state.repositories.map(repo => {
      return (
        <li>
          <ContentRepositoryCard key={repo.name} repository={repo} />
        </li>
      )
    })

    return (
      <div className="content-repository-list">
        <Header />
        <div className="container">
          <h1>Content Repositories</h1>
          <ul className="content-repositories">
            {cards}
            <li className="add-content-repository">
              <Router.Link to="newRepository">New...</Router.Link>
            </li>
          </ul>
        </div>
      </div>
    )
  }
})

module.exports = ContentRepositoryList;
