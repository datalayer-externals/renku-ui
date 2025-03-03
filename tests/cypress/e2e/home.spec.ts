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

import fixtures from "../support/renkulab-fixtures";

describe("display the home page", () => {
  beforeEach(() => {
    fixtures.config().versions().userNone();
    cy.visit("/");
  });

  it("displays the home page intro text", () => {
    cy.get("h1").should("have.length", 1);
    cy.get("h1")
      .first()
      .should(
        "have.text",
        "An open-source knowledge infrastructure for collaborative and reproducible data science"
      );
  });
});

describe("404 page", () => {
  beforeEach(() => {
    fixtures.config().versions().userNone();
    cy.visit("/xzy");
  });

  it("show error page", () => {
    cy.get("h3").should("contain.text", "Page not found");
  });
});

describe("display the home page even when APIs return strange responses", () => {
  beforeEach(() => {
    fixtures.config().versions().statuspageDown().userNone();
    cy.visit("/");
  });

  it("displays the home page intro text", () => {
    cy.wait("@getUser");
    cy.get("h1").should("have.length", 1);
    cy.get("h1")
      .first()
      .should(
        "have.text",
        "An open-source knowledge infrastructure for collaborative and reproducible data science"
      );
  });
});

describe("display version information", () => {
  beforeEach(() => {
    fixtures.config().versions().userNone();
    cy.visit("/");
  });

  it("shows release and component versions", () => {
    cy.getDataCy("version-info").should("be.visible").click();
    cy.contains("Renku version 3.10.0").should("be.visible");
    cy.contains("UI: 3.10.0").should("be.visible");
    cy.contains("Core: v2.4.1").should("be.visible");
    cy.contains("Notebooks: 1.15.2").should("be.visible");
  });
});

const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit,
  sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
  Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
  aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
  velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
   non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

describe("display showcase projects", () => {
  beforeEach(() => {
    fixtures.config().versions().userNone();
    const projects = {
      "lorenzo.cavazzi.tech/readme-file-dev": {
        id: 30929,
        description: loremIpsum,
        name: "Readme file dev",
        images: [{ location: "stockimages/dataset3.png" }],
      },
      "e2e/nuevo-projecto": {
        id: 44966,
        description: "Nuevo projecto description",
        name: "Nuevo projecto",
        images: [{ location: "stockimages/Zurich.jpg" }],
      },
      "e2e/testing-datasets": {
        id: 43781,
        description: "Testing datasets description",
        name: "testing datasets",
        images: [],
      },
      "e2e/local-test-project": {
        id: 39646,
        description: "Local test project description",
        name: "Local test project",
        images: [],
      },
    };
    // fixtures for the showcase projects
    for (const projectId in projects) {
      const project = projects[projectId];
      fixtures.getProjectKG({
        name: `getProjectKG${projectId}`,
        identifier: projectId,
        overrides: {
          identifier: project["id"],
          description: project["description"],
          path: projectId,
          name: project["name"],
          images: project["images"],
        },
      });
    }
    cy.visit("/");
  });

  it("shows showcase projects", () => {
    cy.contains("Real-world use cases")
      .should("be.visible")
      .should("have.prop", "tagName")
      .should("eq", "H3");
    cy.contains("The case studies presented").should("be.visible");
    cy.contains("Readme file dev").should("be.visible");
    cy.contains("Lorem ipsum").should("be.visible");
  });
});

describe("do not display showcase projects", () => {
  beforeEach(() => {
    fixtures
      .config({ overrides: { showcase: { enabled: false } } })
      .versions()
      .userNone();
    cy.visit("/");
  });

  it("does not show showcase projects if not enabled", () => {
    cy.get("[data-cy=section-showcase]").should("not.exist");
  });
});
