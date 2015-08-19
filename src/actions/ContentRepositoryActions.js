import alt from '../alt';
import DockerUtil from '../utils/DockerUtil';

class ContentRepositoryActions {

  launch (controlRepositoryLocation, contentRepositoryPath) {
    let lastID = parseInt(sessionStorage.getItem('content-repository-id') || '0');
    let id = lastID + 1;
    sessionStorage.setItem('content-repository-id', id.toString())

    DockerUtil.launchServicePod(id, controlRepositoryLocation);
    this.dispatch({id, controlRepositoryLocation, contentRepositoryPath});
  }

  prepare (id, preparer, contentURL, contentRepositoryPath) {
    DockerUtil.launchPreparer(id, preparer, contentURL, contentRepositoryPath);
    this.dispatch({id});
  }

  podLaunched ({id, contentContainer, presenterContainer}) {
    this.dispatch({id, contentContainer, presenterContainer});
  }

  preparerLaunched ({id, container}) {
    this.dispatch({id, container});
  }

  error ({id, error}) {
    this.dispatch({id, error});
  }

}

export default alt.createActions(ContentRepositoryActions);
