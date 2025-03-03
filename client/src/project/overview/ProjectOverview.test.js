/*!
 * Copyright 2021 - Swiss Data Science Center (SDSC)
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
 *  ProjectOverview.test.js
 *  Tests for project overview.
 */

import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { createMemoryHistory } from "history";
import { act } from "react-test-renderer";

import { StateModel, globalSchema } from "../../model";
import { testClient as client } from "../../api-client";
import { ProjectCoordinator } from "../index";
import { ProjectOverviewCommits, ProjectOverviewStats } from "./index";

const fakeHistory = createMemoryHistory({
  initialEntries: ["/"],
  initialIndex: 0,
});

describe("rendering", () => {
  const model = new StateModel(globalSchema);
  const props = {
    projectCoordinator: new ProjectCoordinator(
      client,
      model.subModel("project")
    ),
  };

  it("renders ProjectOverviewCommits", async () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    const allProps = {
      history: fakeHistory,
      location: fakeHistory.location,
      ...props,
    };
    await act(async () => {
      root.render(
        <Provider store={model.reduxStore}>
          <MemoryRouter>
            <ProjectOverviewCommits {...allProps} />
          </MemoryRouter>
        </Provider>
      );
    });
  });

  it("renders ProjectOverviewStats", async () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);
    const allProps = {
      branches: [],
      ...props,
    };
    await act(async () => {
      root.render(
        <Provider store={model.reduxStore}>
          <MemoryRouter>
            <ProjectOverviewStats {...allProps} />
          </MemoryRouter>
        </Provider>
      );
    });
  });
});
