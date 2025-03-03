/*!
 * Copyright 2023 - Swiss Data Science Center (SDSC)
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

import { RootStateOrAny, useSelector } from "react-redux";
import { Route, Switch } from "react-router";
import { Col } from "reactstrap";
import { Url } from "../../../utils/helpers/url";
import ProjectSessionsList from "./ProjectSessionsList";
import ShowSession from "./ShowSession";
import StartNewSession from "./StartNewSession";

export default function ProjectSessionsRouter() {
  const pathWithNamespace = useSelector<RootStateOrAny, string>(
    (state) => state.stateModel.project.metadata.pathWithNamespace
  );
  const namespace = useSelector<RootStateOrAny, string>(
    (state) => state.stateModel.project.metadata.namespace
  );
  const path = useSelector<RootStateOrAny, string>(
    (state) => state.stateModel.project.metadata.path
  );

  const projectUrlData = {
    namespace: "",
    path: pathWithNamespace,
  };
  const sessionsListUrl = Url.get(Url.pages.project.session, projectUrlData);
  const startSessionUrl = Url.get(
    Url.pages.project.session.new,
    projectUrlData
  );
  const sessionShowUrl = Url.get(Url.pages.project.session.show, {
    namespace,
    path,
    server: ":server",
  });

  return (
    <Col key="content" xs={12}>
      <Switch>
        <Route exact path={sessionsListUrl}>
          <ProjectSessionsList projectPathWithNamespace={pathWithNamespace} />
        </Route>
        <Route path={startSessionUrl}>
          <StartNewSession />
        </Route>
        <Route path={sessionShowUrl}>
          <ShowSession />
        </Route>
      </Switch>
    </Col>
  );
}
