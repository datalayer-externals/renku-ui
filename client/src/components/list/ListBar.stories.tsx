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

import ListBar from "./ListBar";
import { EntityType } from "../../features/kgSearch";
import { Visibilities } from "../visibility/Visibility";
import { ARG_REDUX_PATH } from "addon-redux";
import { Meta, StoryObj } from "@storybook/react";

const exampleCreators = [
  {
    avatar_url:
      "https://secure.gravatar.com/avatar/d192cd94b7a2bcee6c79ffcebb9c3ff7?s=80&d=identicon",
    id: 68,
    name: "Andrea Test",
    state: "active",
    username: "andrea123",
    web_url: "https://gitlab.dev.renku.ch/dalatinrofrau",
  },
];
const descriptionExample =
  // eslint-disable-next-line spellcheck/spell-checker
  "Lorem ipsum dolor siter gd amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad ut aliquip ex ea.";
const meta: Meta = {
  title: "components/ListBar",
  component: ListBar,
  argTypes: {
    itemType: {
      control: "radio",
      options: [EntityType.Project, EntityType.Dataset],
    },
    visibility: {
      control: "radio",
      options: [
        Visibilities.Public,
        Visibilities.Internal,
        Visibilities.Private,
      ],
    },
    type: {
      table: {
        disable: true,
      },
    },
    timeCaption: { control: "date" },
    updatingDescription: {
      control: { type: "boolean" },
      [ARG_REDUX_PATH]: "stateModel.project.metadata.description.updating",
      defaultValue: false,
    },
  },
};
export default meta;

type Story = StoryObj<typeof ListBar>;
export const ListBarProject: Story = {
  args: {
    id: "test-namespace/test-url",
    url: "projects/test-namespace/test-url",
    title: "test project",
    description: descriptionExample,
    timeCaption: "2023-01-18T12:36:10.827Z",
    labelCaption: "",
    creators: exampleCreators,
    slug: "test-namespace/test-url",
    itemType: EntityType.Project,
    visibility: Visibilities.Public,
    imageUrl: undefined,
    tagList: [],
  },
};

export const ListBarDataset: Story = {
  args: {
    id: "datasets/abcdefg",
    url: "datasets/abcdefg",
    title: "test dataset",
    description: "",
    timeCaption: "2023-01-18T12:36:10.827Z",
    labelCaption: "",
    creators: exampleCreators,
    slug: "test-namespace/test-url",
    itemType: EntityType.Dataset,
    visibility: Visibilities.Public,
    imageUrl: undefined,
    tagList: [],
  },
};
