import alt from '../alt';
import dockerUtil from '../utils/DockerUtil';

class ContentRepositoryActions {

  launch (id, controlRepositoryLocation, contentRepositoryPath) {
    dockerUtil.launchServicePod(id, controlRepositoryLocation);
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
