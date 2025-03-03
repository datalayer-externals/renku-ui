/*!
 * Copyright 2020 - Swiss Data Science Center (SDSC)
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
 *  ProjectNew.state.js
 *  New project controller code.
 */

import { projectKgApi } from "../../features/project/projectKg.api";
import { newProjectSchema } from "../../model/RenkuModels";
import {
  sleep,
  slugFromTitle,
  verifyTitleCharacters,
} from "../../utils/helpers/HelperFunctions";
import { CUSTOM_REPO_NAME } from "./ProjectNew.container";

// ? reference https://docs.gitlab.com/ce/user/reserved_names.html#reserved-project-names
const RESERVED_TITLE_NAMES = [
  "badges",
  "blame",
  "blob",
  "builds",
  "commits",
  "create",
  "create_dir",
  "edit",
  "sessions/folders",
  "files",
  "find_file",
  "gitlab-lfs/objects",
  "info/lfs/objects",
  "new",
  "preview",
  "raw",
  "refs",
  "tree",
  "update",
  "wikis",
];

/**
 * Verify whether the title is valid.
 *
 * @param {string} title - title to validate.
 * @returns {string} error description or null if the string is valid.
 */
function validateTitle(title) {
  if (!title || !title.length) return "Title is missing.";
  else if (RESERVED_TITLE_NAMES.includes(title)) return "Reserved title name.";
  else if (title.length && ["_", "-", " ", "."].includes(title[0]))
    return "Title must start with a letter or a number.";
  else if (!verifyTitleCharacters(title))
    return "Title can contain only letters, digits, '_', '.', '-' or spaces.";
  else if (title && !slugFromTitle(title, true))
    return "Title must contain at least one letter (without any accents) or a number.";
  return null;
}

/**
 * Verify whether the title and namespace will produce a duplicate.
 *
 * @param {string} title - current title.
 * @param {string} namespace - current namespace.
 * @param {string[]} projectsPaths - list of current own projects paths.
 * @returns {boolean} whether the title would create a duplicate or not.
 */
function checkTitleDuplicates(title, namespace, projectsPaths) {
  if (!title || !namespace || !projectsPaths || !projectsPaths.length)
    return false;

  const expectedTitle = slugFromTitle(title, true);
  const expectedSlug = `${namespace}/${expectedTitle}`;
  if (projectsPaths.includes(expectedSlug)) return true;

  return false;
}

class NewProjectCoordinator {
  constructor(client, model, projectsModel) {
    this.client = client;
    this.model = model;
    this.projectsModel = projectsModel;

    // Cannot store avatarFile in the model
    this.avatarFile = null;
  }

  _setTemplateVariables(currentInput, value) {
    const templates = currentInput.userRepo
      ? this.model.get("meta.userTemplates")
      : this.model.get("templates");
    const template = templates.all.filter((t) => t.id === value)[0];
    const variables =
      template && template.variables ? Object.keys(template.variables) : [];

    // preserve already set values or set default values when available
    const oldValues = currentInput.template ? currentInput.variables : {};
    const oldVariables = Object.keys(oldValues);
    const values = variables.reduce((values, variable) => {
      let value = "";

      const variableData = template.variables[variable];
      if (typeof variableData === "object") {
        // set first value for enum, and "false" for boolean
        if (
          variableData["type"] === "enum" &&
          variableData["enum"] &&
          variableData["enum"].length
        )
          value = variableData["enum"][0];

        // set default, if any
        if (
          typeof variableData === "object" &&
          variableData["default_value"] != null
        )
          value = variableData["default_value"];
      }

      // set older value, if any
      if (oldVariables.includes(variable)) value = oldValues[variable];

      return { ...values, [variable]: value };
    }, {});

    return values;
  }

  resetAutomated(manuallyReset = false) {
    if (this.model.get("automated.received")) {
      const pristineAutomated = newProjectSchema.createInitialized().automated;
      this.model.setObject({
        automated: { ...pristineAutomated, manuallyReset },
      });
    }
  }

  /**
   * Set newProject.automated object with new content -- either the provided data or an error
   * @param {object} data - data to pre-fill
   * @param {object} [error] - error generated while parsing the data
   * @param {object} [namespaces] - up-to-date namespaces object
   * @param {object} [availableVisibilities] - up-to-date visibilities object
   * @param {object} [setNamespace] - function to set namespace, it is necessary to calculate visibilities
   */
  setAutomated(data, error, namespaces, availableVisibilities, setNamespace) {
    // ? This is a safeguard in case it's accidentally invoked multiple times.
    const currentStatus = this.model.get("automated");
    if (currentStatus.received && currentStatus.valid && currentStatus.step > 0)
      return;
    let automated = newProjectSchema.createInitialized().automated;
    if (error) {
      automated = {
        ...automated,
        received: true,
        valid: false,
        finished: true,
        error: error.message ? error.message : error,
      };
      this.model.set("automated", automated);
    } else {
      automated = {
        ...automated,
        received: true,
        valid: true,
        data: { ...automated.data, ...data },
      };
      // ? passing the content is more efficient than invoking the `model.set` and then the function.
      this.autoFill(automated, namespaces, availableVisibilities, setNamespace);
    }
  }

  /**
   * Get all the auto-fill content and fill in the provided data.
   * @param {object} [automatedObject] - pass the up-to-date `automated` object to optimize performance.
   * @param {object} [namespaces] - up-to-date namespaces
   * @param {object} [availableVisibilities] - available visibilities
   * @param {function} [setNamespace] - function to set a new namespace, it is necessary to calculate the visibilities
   */
  async autoFill(
    automatedObject,
    namespaces,
    availableVisibilities,
    setNamespace
  ) {
    let automated = automatedObject
      ? automatedObject
      : newProjectSchema.createInitialized().automated;
    let availableVariables = [];
    let visibilities = availableVisibilities?.visibilities;
    const { data } = automated;
    let getDataAttempts = 0;
    let maxAttempts = 60;

    // Step 1: wait for templates to be fetched
    automated.step = 1;
    this.model.set("automated", { ...automated });
    // ? since this is triggered elsewhere, we need to use ugly timeouts here
    const intervalLength = 1;
    let templates = false;
    do {
      if (this.model.get("automated.manuallyReset")) return;
      // check templates availability
      if (!templates) {
        getDataAttempts++;
        const templatesStatus = this.model.get("templates");
        if (templatesStatus.fetched && !templatesStatus.fetching)
          templates = templatesStatus.all;
      }
      await sleep(intervalLength);
    } while (!templates && getDataAttempts <= maxAttempts);
    if (!templates) {
      automated.error = `Fetching templates takes too long.`;
      automated.finished = true;
      this.model.set("automated", { ...automated });
      return;
    }

    // Step 2: Set title, namespace, template (if no url/ref). Start fetching visibilities
    if (this.model.get("automated.manuallyReset")) return;
    automated.step = 2;
    this.model.set("automated.step", 2);
    let newInput = {};
    if (data.title) {
      this.setProperty("title", data.title);
      newInput.title = data.title;
    }
    if (data.description) {
      this.setProperty("description", data.description);
      newInput.description = data.description;
    }
    if (data.namespace) {
      // Check if the namespace is available
      const namespaceAvailable = namespaces?.list?.find(
        (namespace) => namespace.full_path === data.namespace
      );
      if (!namespaceAvailable) {
        automated.warnings = [
          ...automated.warnings,
          `The namespace "${data.namespace}" is not available.`,
        ];
      } else {
        this.setProperty("namespace", data.namespace); // full path
        newInput.namespace = data.namespace;
        setNamespace(namespaceAvailable); // this will trigger to set visibilities according to namespace
      }
    }
    if (data.template && !data.url) {
      // Check if the template is available
      const templates = this.model.get("templates.all");
      const templateAvailable = templates.find(
        (template) => template.id === data.template
      );
      if (!templateAvailable) {
        automated.error = `The template "${data.template}" is not available.`;
        automated.finished = true;
        this.model.set("automated", { ...automated });
        return;
      }
      this.setProperty("template", data.template);
      newInput.template = data.template;
      availableVariables = templateAvailable.variables;
    }

    // Step 3: Set visibility and fetch custom template (requires url/ref).
    if (this.model.get("automated.manuallyReset")) return;
    automated.step = 3;
    this.model.set("automated.step", 3);
    if (data.ref && data.url) {
      const ref = data.ref ? data.ref : "master";
      this.setProperty("userRepo", true);
      this.setTemplateProperty("url", data.url);
      this.setTemplateProperty("ref", ref);
      const repositories = [
        { name: CUSTOM_REPO_NAME, url: data.url, ref: ref },
      ];
      const templates = await this.getTemplates(repositories, true);
      if (this.model.get("automated.manuallyReset")) return;
      if (!templates || !templates.length) {
        automated.error =
          "Something went wrong while fetching the template repositories.";
        automated.error += "\nSee below for further details.";
        automated.finished = true;
        this.model.set("automated", { ...automated });
        return;
      }
      if (data.template) {
        const templateAvailable = templates.find(
          (template) => template.id === data.template
        );
        if (!templateAvailable) {
          automated.error = `The template "${data.template}" is not available.`;
          automated.finished = true;
          this.model.set("automated", { ...automated });
          return;
        }
        this.setProperty("template", data.template);
        newInput.template = data.template;
        availableVariables = templateAvailable.variables;
      }
    }

    if (data.visibility) {
      if (!visibilities) {
        // wait for namespace visibilities to be available
        let namespace = null;
        getDataAttempts = 0;
        do {
          // check namespaces availability
          if (this.model.get("automated.manuallyReset")) return;
          if (!visibilities) {
            namespace = this.model.get("meta.namespace");
            if (namespace.fetched && !namespace.fetching)
              visibilities = namespace.visibilities;
          }
          getDataAttempts++;
          await sleep(intervalLength);
        } while (!visibilities && getDataAttempts < maxAttempts);
      }
      if (!visibilities) {
        automated.error = `Fetching visibilities takes too long.`;
        automated.finished = true;
        this.model.set("automated", { ...automated });
        return;
      }
      if (visibilities?.includes(data.visibility)) {
        this.setProperty("visibility", data.visibility);
      } else {
        automated.warnings = [
          ...automated.warnings,
          `The visibility "${data.namespace}" is not available in the target namespace.`,
        ];
      }
    }

    // Step 4: Set variables.
    if (this.model.get("automated.manuallyReset")) return;
    automated.step = 4;
    this.model.set("automated.step", 4);
    if (data.template && data.variables && Object.keys(data.variables)) {
      if (availableVariables && Object.keys(availableVariables)) {
        // Try to set variables after checking for availability on the target template.
        const templateVariables = Object.keys(availableVariables);
        let unavailableVariables = [];
        for (let variable of Object.keys(data.variables)) {
          if (templateVariables.includes(variable))
            this.setVariable(variable, data.variables[variable]);
          else unavailableVariables = [...unavailableVariables, variable];
        }
        if (unavailableVariables.length) {
          automated.warnings = [
            ...automated.warnings,
            `Some variables are not available on this template: ${unavailableVariables.join(
              ", "
            )}.`,
          ];
        }
      } else {
        automated.warnings = [
          ...automated.warnings,
          "No variables available for the target template.",
        ];
      }
    }
    automated.finished = true;
    this.model.set("automated", { ...automated });
  }

  resetInput() {
    const pristineInput = newProjectSchema.createInitialized().input;
    this.avatarFile = null;
    this.model.setObject({ input: pristineInput });
  }

  setProperty(property, value) {
    const currentInput = this.model.get("input");
    // if the property is tha avatar, handle it a little differently
    if (property === "avatar") {
      this.avatarFile = value;
      // We do not need to track this change in the model
      const updateObj = { meta: { avatar: value?.name } };
      return updateObj;
    }
    // check if the value needs to be updated
    if (currentInput[property] === value) return;
    let updateObj = { input: { [property]: value } };
    if (currentInput[`${property}Pristine`])
      updateObj.input[`${property}Pristine`] = false;

    // reset knowledgeGraph when needed
    if (property === "visibility") updateObj.input.knowledgeGraph = true;

    // unset template when changing source
    if (property === "userRepo") updateObj.input.template = "";

    // pre-set variables and reset when needed
    if (property === "template")
      updateObj.input.variables = {
        $set: this._setTemplateVariables(currentInput, value),
      };

    this.model.setObject(updateObj);
    return updateObj;
  }

  getSlugAndReset() {
    const creation = this.model.get("meta.creation");
    this.resetCreationResult();
    return `${creation.newNamespace}/${creation.newNameSlug}`;
  }

  resetCreationResult() {
    const pristineCreation = newProjectSchema.createInitialized().meta.creation;
    this.model.setObject({ meta: { creation: pristineCreation } });
  }

  setVariable(variable, value) {
    this.model.set(`input.variables.${variable}`, value);
  }

  setTemplateProperty(property, value) {
    const currentInput = this.model.get("meta.userTemplates");

    // check if the value needs to be updated
    if (currentInput[property] === value) return;
    this.model.set(`meta.userTemplates.${property}`, value);
    let updateObj = {
      meta: { userTemplates: { [property]: value, fetched: false } },
    };
    this.model.setObject(updateObj);
  }

  setConfig(custom, repositories) {
    let updateObject = {
      config: {
        custom,
        repositories: { $set: repositories },
      },
    };

    // set the user repo to false if not allowed to change it
    if (!custom) updateObject.input = { userRepo: false };

    this.model.setObject(updateObject);
  }

  /**
   * Put the template data in the proper object in the store and validate them.
   *
   * @param {object} templateData - template data
   * @param {boolean} [userRepo] - whether or not it's a user custom repo
   */
  createTemplatesObject(templateData, userRepo = false) {
    const validation = this.validate(null, templateData);
    const updateObject = userRepo
      ? { meta: { userTemplates: templateData, validation } }
      : { templates: templateData, meta: { validation } };
    return updateObject;
  }

  /**
   * Fetch all the templates listed in the sources
   *
   * @param {object[]} [sources] - List of sources in the format { url, ref, name }. If not provided,
   *   the list in model.config.repositories will be used instead.
   * @param {boolean} [userRepo] - whether or not it's a user custom repo
   */
  async getTemplates(sources = null, userRepo = false) {
    // use deployment repositories if nothing else is provided
    if (!sources || !sources.length)
      sources = this.model.get("config.repositories");

    // verify sources and set fetching status
    if (!sources || !sources.length) {
      const errorText =
        "No project templates are available in this RenkuLab deployment. Please notify a RenkuLab " +
        "administrator and ask them to configure a project template repository.";
      const templatesObject = {
        fetched: false,
        fetching: false,
        all: { $set: [] },
        errors: { $set: [{ global: errorText }] },
      };
      this.model.setObject(
        this.createTemplatesObject(templatesObject, userRepo)
      );
      throw errorText;
    }

    this.model.setObject(
      this.createTemplatesObject({ fetching: true }, userRepo)
    );

    // fetch manifest and collect templates and errors
    let errors = [],
      templates = [];
    for (const source of sources) {
      const answer = await this.getTemplate(source.url, source.ref);
      if (Array.isArray(answer)) {
        for (const template of answer) {
          templates.push({
            parentRepo: source.name,
            parentTemplate: template.folder,
            id: `${source.name}/${template.folder}`,
            name: template.name,
            description: template.description,
            variables: template.variables,
            icon: template.icon,
          });
        }
      } else {
        errors.push({ [source.name]: answer });
      }
    }

    const templatesObject = {
      fetched: new Date(),
      fetching: false,
      errors: { $set: errors },
      all: { $set: templates },
    };
    const valObj = this.createTemplatesObject(templatesObject, userRepo);
    this.model.setObject(valObj);
    return templates;
  }

  /**
   * Fetch single template and return manifest array or error message.
   *
   * @param {string} url - Target template repository url
   * @param {string} ref - Target ref (tag, commit or branch)
   */
  async getTemplate(url, ref) {
    const resp = await this.client.getTemplatesManifest(url, ref);
    if (resp.error) return resp.error;
    else if (resp.result.templates && resp.result.templates.length)
      return resp.result.templates;
    return "No templates available in this repo.";
  }

  resetVisibility(namespace) {
    this.model.setObject({
      meta: {
        namespace: {
          fetched: null,
          fetching: true,
          id: namespace.full_path,
          visibility: null,
          visibilities: { $set: null },
        },
      },
    });
  }

  async setVisibilities(availableVisibilities, namespace) {
    let updateObject = {
      meta: {
        namespace: {
          visibility: availableVisibilities.default,
          visibilities: availableVisibilities.visibilities,
          fetching: false,
          id: namespace.full_path,
        },
      },
    };

    // save the model
    this.model.setObject(updateObject);
    return availableVisibilities;
  }

  /**
   * Post a project to the target repository, manage visibility and KG.
   *
   * @param {string} repositoryUrl - target url repository.
   */
  async postProject(repositoryUrl) {
    const input = this.model.get("input");

    // set backend project details
    let newProjectData = {
      project_repository: repositoryUrl,
      project_namespace: input.namespace,
      project_name: input.title,
      project_description: input.description,
    };

    // add template details
    if (!input.userRepo) {
      const templates = this.model.get("templates.all");
      const referenceTemplate = templates.filter(
        (t) => t.id === input.template
      )[0];
      newProjectData.identifier = referenceTemplate.parentTemplate;
      const repositories = this.model.get("config.repositories");
      const referenceRepository = repositories.filter(
        (r) => r.name === referenceTemplate.parentRepo
      )[0];
      newProjectData.url = referenceRepository.url;
      newProjectData.ref = referenceRepository.ref;
    } else {
      const userTemplates = this.model.get("meta.userTemplates");
      newProjectData.identifier = input.template.replace(
        CUSTOM_REPO_NAME + "/",
        ""
      );
      newProjectData.url = userTemplates.url;
      newProjectData.ref = userTemplates.ref;
    }

    // add variables after converting to string (renku core accept string only)
    let parameters = [];
    for (let variable of Object.keys(input.variables))
      parameters.push({
        key: variable,
        value: input.variables[variable].toString(),
      });
    newProjectData.parameters = parameters;

    // reset all previous creation progresses and invoke the project creation API
    const pristineCreation = newProjectSchema.createInitialized().meta.creation;
    let modelUpdates = { meta: { creation: pristineCreation } };
    modelUpdates.meta.creation.creating = true;
    this.model.setObject(modelUpdates);
    const projectResult = await this.client.postNewProject(newProjectData);
    modelUpdates.meta.creation.creating = false;
    if (projectResult.error) {
      modelUpdates.meta.creation.created = false;
      modelUpdates.meta.creation.createError = projectResult.error;
      this.model.setObject(modelUpdates);
      return modelUpdates;
    }
    modelUpdates.meta.creation.created = true;
    modelUpdates.meta.creation.newName = projectResult.result.name;
    modelUpdates.meta.creation.newNameSlug = projectResult.result.slug;
    modelUpdates.meta.creation.newNamespace = projectResult.result.namespace;
    modelUpdates.meta.creation.newUrl = projectResult.result.url;
    const slug = `${projectResult.result.namespace}/${projectResult.result.slug}`;

    // update project details like visibility and name
    // currently postNewProject returns the project name as the original project name even when it is created with "-"
    // the way to validate if the project name needs to be updated is to check against the slug
    modelUpdates.meta.creation.projectError = "";
    if (
      input.visibility !== "private" ||
      projectResult.result.slug !== input.title
    ) {
      modelUpdates.meta.creation.projectUpdating = true;
      this.model.setObject(modelUpdates);
      let projectObject = {};
      if (input.visibility !== "private")
        projectObject["visibility"] = input.visibility;
      if (projectResult.result.slug !== input.title)
        projectObject["name"] = input.title;
      try {
        await this.client.putProjectField(
          encodeURIComponent(slug),
          projectObject
        );
        modelUpdates.meta.creation.projectUpdated = true;
      } catch (error) {
        modelUpdates.meta.creation.projectError = error.message
          ? error.message
          : error;
      }
      modelUpdates.meta.creation.projectUpdating = false;
      this.model.setObject(modelUpdates);
    } else {
      modelUpdates.meta.creation.projectUpdated = true;
    }
    // Get the project -- we need it do so some other operations
    let newProjectResult;
    try {
      newProjectResult = await this.client.getProject(slug);
    } catch (error) {
      modelUpdates.meta.creation.projectError = error.message
        ? error.message
        : error;
    }

    if (newProjectResult != null) {
      // upload the project avatar if there is one
      if (this.avatarFile != null) {
        modelUpdates.meta.creation.projectUpdating = true;
        this.model.setObject(modelUpdates);
        try {
          await this.client.setAvatar(
            newProjectResult.data.all.id,
            this.avatarFile
          );
          modelUpdates.meta.creation.projectUpdated = true;
        } catch (error) {
          modelUpdates.meta.creation.projectError = error.message
            ? error.message
            : error;
        }
        modelUpdates.meta.creation.projectUpdating = false;
        this.model.setObject(modelUpdates);
      }

      // activate knowledge graph
      modelUpdates.meta.creation.kgError = "";
      if (input.knowledgeGraph) {
        modelUpdates.meta.creation.kgUpdating = true;
        this.model.setObject(modelUpdates);

        // get project id for the KG query
        try {
          const resp = await this.model.reduxStore.dispatch(
            projectKgApi.endpoints.activateIndexing.initiate(
              newProjectResult.data.all.id
            )
          );
          const succeeded = (resp?.data?.message ?? "").includes("created")
            ? true
            : false;
          if (succeeded) modelUpdates.meta.creation.kgUpdated = true;
          else
            modelUpdates.meta.creation.kgError =
              "Activating project indexing failed on server side.";
        } catch (error) {
          modelUpdates.meta.creation.kgError = error.message
            ? error.message
            : "Unknown error.";
        }
        modelUpdates.meta.creation.kgUpdating = false;
      } else {
        modelUpdates.meta.creation.kgUpdated = true;
      }
    }

    // reset all the input/errors if creation was successful
    const { creation } = modelUpdates.meta;
    if (!creation.createError && !creation.kgError && !creation.projectError) {
      const pristineModel = newProjectSchema.createInitialized();
      modelUpdates.input = pristineModel.input;
      modelUpdates.automated = pristineModel.automated;
      modelUpdates.meta.validation = pristineModel.meta.validation;
    }

    this.model.setObject(modelUpdates);
    return modelUpdates;
  }

  invalidatePristine() {
    const input = this.model.get("input");
    const pristineProps = Object.keys(input).filter(
      (prop) => prop.endsWith("Pristine") && input[prop]
    );
    if (pristineProps.length) {
      const inputObj = pristineProps.reduce(
        (obj, prop) => ({ ...obj, [prop]: false }),
        {}
      );
      this.model.setObject({ input: inputObj });
      return true;
    }
    return false;
  }

  getValidation() {
    return this.model.get("meta.validation");
  }

  /**
   * Perform client-side validation. Optional input and templates objects can be passed with updated values.
   * That will be assigned to the current input/templates.
   *
   * @param {Object} [newInput] - input object containing only the updated fields.
   * @param {Object} [newTemplates] - templates object containing only the updated fields.
   * @param {bool} [update] - set true to update the values inside the function.
   * @param {Object} [projects] - optionally provide the projects object
   * @param {Object} [namespaces] - up-to-date namespaces object
   * @param {boolean} [isFetchingVisibilities] - to indicate if the visibilities are ready
   */
  validate(
    newInput,
    newTemplates,
    update,
    projects,
    namespaces,
    isFetchingVisibilities
  ) {
    // get all the necessary data
    let model = this.model.get();
    let { templates, input, meta } = model;

    const projectsPaths =
      projects && projects?.members?.length
        ? projects.members?.map((project) =>
            project.path_with_namespace.toLowerCase()
          )
        : [];
    // assign input changes-to-be
    if (newInput) input = Object.assign({}, input, newInput);
    const { userRepo } = input;

    // assign templates changes-to-be
    if (userRepo) templates = meta.userTemplates;
    if (newTemplates) templates = Object.assign({}, templates, newTemplates);

    // check warnings (temporary problems)
    let warnings = {};
    if (namespaces && namespaces.fetching)
      warnings["namespace"] = "Fetching namespaces...";

    if (projects && projects.fetching)
      warnings["title"] = "Fetching projects to prevent duplicates...";

    if (meta.namespace.fetching || isFetchingVisibilities)
      warnings["visibility"] = "Verifying visibility constraints...";

    if (templates.fetching) warnings["template"] = "Fetching templates...";
    else if (!templates.fetched)
      warnings["template"] = "Must fetch the templates first.";

    // check title errors (requires user intervention)
    let errors = {};
    const titleNotValid = validateTitle(input.title);
    if (titleNotValid) {
      errors["title"] = titleNotValid;
    } else {
      const isDuplicate = checkTitleDuplicates(
        input.title,
        input.namespace,
        projectsPaths
      );
      if (isDuplicate) {
        errors["title"] =
          "Title produces a project identifier (" +
          slugFromTitle(input.title, true) +
          ") that is already taken in the selected namespace. " +
          "Please select a different title or namespace.";
      }
    }

    // check other errors (requires user intervention). Skip if there is already a warning
    if (!warnings["namespace"] && !input.namespace)
      errors["namespace"] = "Please select the namespace for the project.";

    if (!warnings["visibility"] && !input.visibility)
      errors["visibility"] = "Please select a visibility level.";

    if (!warnings["template"] && !input.template)
      errors["template"] = "Please select a template.";

    // create validation object and update model directly or return it;
    const validation = {
      warnings: { $set: warnings },
      errors: { $set: errors },
    };
    if (update) this.model.setObject({ meta: { validation } });
    return validation;
  }
}

export { NewProjectCoordinator, checkTitleDuplicates, validateTitle };

// test only
export { RESERVED_TITLE_NAMES };
