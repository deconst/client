import alt from '../alt';
import DockerUtil from '../utils/DockerUtil';

class ContentRepositoryActions {

  launch (id, controlRepositoryLocation, contentRepositoryPath) {
    DockerUtil.launchServicePod(id, controlRepositoryLocation);
    this.dispatch({id, controlRepositoryLocation, contentRepositoryPath});
  }

  podLaunched ({id, contentContainer, presenterContainer}) {
    this.dispatch({id, contentContainer, presenterContainer});
  }

  error ({id, error}) {
    this.dispatch({id, error});
  }

}

export default alt.createActions(ContentRepositoryActions);
