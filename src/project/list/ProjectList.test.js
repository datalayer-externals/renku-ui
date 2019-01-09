/*!
 * Copyright 2019 - Swiss Data Science Center (SDSC)
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
 *  renku-ui
 *
 *  ProjectList.test.js
 *  Tests for project/list.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryHistory } from 'history';

import ProjectList from './';
import ProjectListModel from  './ProjectList.state';
import { testClient as client } from '../../api-client';


const fakeHistory = createMemoryHistory({
  initialEntries: [ '/' ],
  initialIndex: 0,
})
fakeHistory.push({
  pathname: '/projects',
  search: '?page=1'
})

describe('rendering', () => {
  const user = {username: "test"};
  it('renders list without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(
      <MemoryRouter>
        <ProjectList client={client} history={fakeHistory} location={fakeHistory.location}/>
      </MemoryRouter>
      , div);
  });
});

describe('new project actions', () => {
  const model = new ProjectListModel(client);
  it('is initialized correctly', () => {
    expect(model.get('currentPage')).toEqual(undefined);
  });
  it('retrieves initial page', () => {
    return model.setPage(1).then(() => {
      expect(model.get('currentPage')).toEqual(1);
    })
  });
});
