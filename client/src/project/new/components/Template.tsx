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

import { FormGroup } from "reactstrap";
import TemplateSelector from "../../../components/templateSelector/TemplateSelector";
import {
  NewProjectConfig,
  NewProjectInput,
  NewProjectMeta,
  NewProjectTemplate,
  NewProjectTemplates,
} from "../../../model/RenkuModels";

interface TemplateProps {
  config: NewProjectConfig;
  handlers: {
    setProperty: (target: string, value: unknown) => void;
  };
  input: NewProjectInput;
  templates: NewProjectTemplates;
  meta: NewProjectMeta;
}

/** Template field group component */
export const Template = ({
  config,
  handlers,
  input,
  templates,
  meta,
}: TemplateProps) => {
  const error = meta.validation.errors["template"];
  const invalid = !!error && !input.templatePristine;

  const isFetching =
    (!input.userRepo && !!templates.fetching) ||
    (input.userRepo && !!meta.userTemplates.fetching);
  const noFetchedUserRepo = input.userRepo && !meta.userTemplates.fetched;
  // Pass down templates and repository with the same format to the gallery component
  const [listedTemplates, repositories] = input.userRepo
    ? [
        meta.userTemplates.all,
        [
          {
            url: meta.userTemplates.url,
            ref: meta.userTemplates.ref,
            name: "Custom",
          },
        ],
      ]
    : [templates.all, config.repositories];

  const select = (template: NewProjectTemplate) =>
    handlers.setProperty("template", template);

  return (
    <FormGroup className="field-group">
      <TemplateSelector
        repositories={repositories}
        select={select}
        selected={input.template}
        templates={listedTemplates}
        isRequired
        isInvalid={invalid}
        isFetching={isFetching}
        noFetchedUserRepo={noFetchedUserRepo}
        error={error}
      />
    </FormGroup>
  );
};
