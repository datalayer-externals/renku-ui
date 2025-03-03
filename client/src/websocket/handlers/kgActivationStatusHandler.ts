/*!
 * Copyright 2022 - Swiss Data Science Center (SDSC)
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

import { updateProgress } from "../../features/inactiveKgProjects/inactiveKgProjectsSlice";

/* eslint-disable @typescript-eslint/no-explicit-any */

function handleKgActivationStatus(
  data: Record<string, unknown>,
  webSocket: WebSocket,
  model: any,
  notifications: any
) {
  if (data.message) {
    const statuses = JSON.parse(data.message as string);
    updateStatus(statuses, model.reduxStore);
    processStatusForNotifications(statuses, notifications);
  }
  return null;
}

function updateStatus(kgActivation: any, store: any) {
  Object.keys(kgActivation).forEach((projectId: string) => {
    const id = parseInt(projectId);
    if (id > 0) {
      const status = kgActivation[projectId] ?? null;
      store.dispatch(updateProgress({ id, progress: status }));
    }
  });
}

function processStatusForNotifications(
  statuses: Record<number, number>,
  notifications: any
) {
  Object.keys(statuses).forEach((projectId: string) => {
    const id = parseInt(projectId);
    if (id > 0) {
      const status = statuses[id] ?? null;
      if (status === 100) {
        notifications.addSuccess(
          notifications.Topics.KG_ACTIVATION,
          "Project indexing has been activated.",
          "/inactive-kg-projects",
          "Go to activation page",
          "/inactive-kg-projects",
          "Check the status of projects that need to be indexed."
        );
      }
      if (status === -2) {
        notifications.addError(
          notifications.Topics.KG_ACTIVATION,
          "Project indexing has been activated, but with errors.",
          "/inactive-kg-projects",
          "Go to activation page",
          "/inactive-kg-projects",
          "Check the status of projects that need to be indexed"
        );
      }
    }
  });
}

export { handleKgActivationStatus };
