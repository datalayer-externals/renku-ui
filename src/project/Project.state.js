/*!
 * Copyright 2017 - Swiss Data Science Center (SDSC)
 * A partnership between École Polytechnique Fédérale de Lausanne (EPFL) and
 * Eidgenössische Technische Hochschule Zürich (ETHZ).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 *  incubator-renku-ui
 *
 *  Project.state.js
 *  Redux-based state-management code.
 */

import { UserState } from '../app-state';
import { API_ERRORS } from '../gitlab/renkuFetch';
import { StateModel} from '../model/Model';
import { projectSchema } from '../model/RenkuModels';


const List = {
  fetch: (client) => {
    return (dispatch) => {
      dispatch(List.request());
      client.getProjects()
        .then(d => dispatch(List.receive(d)))
        .catch(() => dispatch(List.receive([])));
    }
  },
  request: () => {
    const action = {type:'server_request' };
    return action
  },
  receive: (results) => {
    const action = {type:'server_return', payload: results };
    return action
  },
  append: (results) => {
    const action = {type:'server_return', payload: { hits: results } };
    return action
  },
  reducer: (state, action) => {
    if (state == null) state = {projects:[]}
    if (action.type !== 'server_return') return state;
    const results = {projects: state.projects.concat(action.payload)};
    return results
  }
};


class ProjectModel extends StateModel {
  constructor(stateBinding, stateHolder, initialState) {
    super(projectSchema, stateBinding, stateHolder, initialState)
  }

  // TODO: Do we really want to re-fetch the entire project on every change?

  // TODO: Once state and client are fully adapted to each other, these functions should be trivial
  fetchProject(client, id) {
    return client.getProject(id, {notebooks:true, data:true})
      .then(d => {
        const files = d.files || this.get('files');
        const updatedState = {
          core: d.metadata.core,
          system: d.metadata.system,
          visibility: d.metadata.visibility,
          files: files
        };
        this.setObject(updatedState);
        this.fetchNotebookServerUrl(client, id, updatedState);
        return d;
      })
  }

  fetchNotebookServerUrl(client, id, projectState) {
    client.getNotebookServerUrl(id, projectState.core.path_with_namespace)
      .then(notebookUrl => {
        this.set('core.notebookServerUrl', notebookUrl);
      });
  }

  fetchModifiedFiles(client, id) {
    client.getModifiedFiles(id)
      .then(d => {
        this.set('files.modifiedFiles', d)
      })
  }

  fetchMergeRequests(client, id) {
    this.setUpdating({system: {merge_requests: true}});
    client.getMergeRequests(id)
      .then(d => {
        this.set('system.merge_requests', d)
      })
  }

  fetchBranches(client, id) {
    this.setUpdating({system: {branches: true}});
    client.getBranches(id)
      .then(d => {
        this.set('system.branches', d)
      })
  }

  fetchReadme(client, id) {
    this.setUpdating({data: {readme: {text: true}}});
    client.getProjectReadme(id)
      .then(d => this.set('data.readme.text', d.text))
      .catch(error => {
        if (error.case === API_ERRORS.notFoundError) {
          this.set('data.readme.text', 'No readme file found.')
        }
      })
  }

  setTags(client, id, name, tags) {
    this.setUpdating({system: {tag_list: [true]}});
    client.setTags(id, name, tags).then(() => {
      this.fetchProject(client, id);
    })
  }

  setDescription(client, id, name, description) {
    this.setUpdating({core: {description: true}});
    client.setDescription(id, name, description).then(() => {
      this.fetchProject(client, id);
    })
  }

  star(client, id, userStateDispatch, starred) {
    client.starProject(id, starred).then((d) => {
      // TODO: Bad naming here - will be resolved once the user state is re-implemented.
      this.fetchProject(client, id).then(p => userStateDispatch(UserState.star(p.metadata.core)))

    })
  }

  fetchCIJobs(client, id) {
    this.setUpdating({system: {ci_jobs: true}});
    client.getJobs(id)
      .then((d) => {
        this.set('system.ci_jobs', d)
      })
      .catch((error) => this.set('system.ci_jobs', []));
  }
}

export default { List };
export { ProjectModel };
