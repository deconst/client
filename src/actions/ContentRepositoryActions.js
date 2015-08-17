import alt from '../alt';
import dockerUtil from '../utils/DockerUtil';

class ContentRepositoryActions {

  launch (id, contentRepositoryPath) {
    dockerUtil.launchServicePod(id, contentRepositoryPath);
    this.dispatch({id, contentRepositoryPath});
  }

  podLaunched ({id, content, presenter}) {
    this.dispatch({id, content, presenter});
  }

  error ({id, error}) {
    this.dispatch({id, error});
  }

}

export default alt.createActions(ContentRepositoryActions);
