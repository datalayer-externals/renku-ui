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

import { useMemo } from "react";
import { Container } from "reactstrap";
import { ErrorAlert } from "../../../components/Alert";
import { Loader } from "../../../components/Loader";
import { NotebooksHelper } from "../../../notebooks";
import { useGetSessionsQuery } from "../sessions.api";
import { Session, Sessions } from "../sessions.types";
import SessionSaveWarning from "./SessionSaveWarning";
import SessionsList from "./SessionsList";

interface ProjectSessionsListProps {
  projectPathWithNamespace: string;
}

export default function ProjectSessionsList({
  projectPathWithNamespace,
}: ProjectSessionsListProps) {
  const { isLoading } = useGetSessionsQuery();
  const projectSessions = useProjectSessions({ projectPathWithNamespace });

  if (isLoading) {
    return <Loader />;
  }

  if (!projectSessions) {
    return (
      <ErrorAlert>
        <p className="mb-0">Error while fetching sessions.</p>
      </ErrorAlert>
    );
  }

  return (
    <>
      <Container fluid>
        <SessionsList disableProjectTitle sessions={projectSessions} />
      </Container>
      <SessionSaveWarning />
    </>
  );
}

export function useProjectSessions({
  projectPathWithNamespace,
}: ProjectSessionsListProps) {
  const { data: sessions } = useGetSessionsQuery();
  const projectSessions = useMemo(
    () =>
      sessions != null
        ? Object.entries(sessions)
            .filter(([, session]) => {
              const annotations = NotebooksHelper.cleanAnnotations(
                session.annotations
              ) as Session["annotations"];
              const fullPath = `${annotations["namespace"]}/${annotations["projectName"]}`;
              return (
                fullPath.toLowerCase() ===
                projectPathWithNamespace.toLowerCase()
              );
            })
            .reduce(
              (prev, [name, session]) => ({ ...prev, [name]: session }),
              {} as Sessions
            )
        : null,
    [projectPathWithNamespace, sessions]
  );
  return projectSessions;
}
