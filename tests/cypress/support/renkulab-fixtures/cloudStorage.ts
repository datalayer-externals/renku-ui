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

import { FixturesConstructor } from "./fixtures";
import { NameOnlyFixture, SimpleFixture } from "./fixtures.types";

/**
 * Fixtures for Cloud Storage
 */

export function CloudStorage<T extends FixturesConstructor>(Parent: T) {
  return class CloudStorageFixtures extends Parent {
    cloudStorage(args?: SimpleFixture) {
      const {
        fixture = "cloudStorage/cloud-storage.json",
        name = "getCloudStorage",
      } = args ?? {};
      const response = { fixture };
      cy.intercept("GET", "/ui-server/api/data/storage*", response).as(name);
      return this;
    }

    postCloudStorage(args?: SimpleFixture) {
      const {
        fixture = "cloudStorage/new-cloud-storage.json",
        name = "postCloudStorage",
      } = args ?? {};
      const response = { fixture, statusCode: 201 };
      cy.intercept("POST", "/ui-server/api/data/storage", response).as(name);
      return this;
    }

    patchCloudStorage(args?: NameOnlyFixture) {
      const { name = "patchCloudStorage" } = args ?? {};
      const response = { statusCode: 201 };
      cy.intercept("PATCH", "/ui-server/api/data/storage/*", response).as(name);
      return this;
    }

    deleteCloudStorage(args?: NameOnlyFixture) {
      const { name = "deleteCloudStorage" } = args ?? {};
      const response = { statusCode: 204 };
      cy.intercept("DELETE", "/ui-server/api/data/storage/*", response).as(
        name
      );
      return this;
    }
  };
}
