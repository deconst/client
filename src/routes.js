// Modified from Kitematic by Ash Wilson

import React from 'react/addons';
import Setup from './components/Setup.react';
import About from './components/About.react';
import ContentRepositoryList from './components/ContentRepositoryList.react';
import EditContentRepository from './components/EditContentRepository.react';
import Router from 'react-router';

var Route = Router.Route;
var DefaultRoute = Router.DefaultRoute;
var RouteHandler = Router.RouteHandler;

var App = React.createClass({
  render: function () {
    return (
      <RouteHandler/>
    );
  }
});

var routes = (
  <Route name="app" path="/" handler={App}>
    <Route name="about" path="/about" handler={About}/>
    <Route name="repositoryList" path="/repository-list" handler={ContentRepositoryList}/>
    <Route name="editRepository" path="/edit-repository" handler={EditContentRepository}/>
    <DefaultRoute name="setup" handler={Setup}/>
  </Route>
);

module.exports = routes;
