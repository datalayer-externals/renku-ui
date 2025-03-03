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

import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckLg, CloudFill, PlusLg, XLg } from "react-bootstrap-icons";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { RootStateOrAny, useSelector } from "react-redux";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormText,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
} from "reactstrap";
import { Loader } from "../../../components/Loader";
import { RtkErrorAlert } from "../../../components/errors/RtkErrorAlert";
import { StateModelProject } from "../Project";
import {
  useAddCloudStorageForProjectMutation,
  useUpdateCloudStorageMutation,
} from "../projectCloudStorage.api";
import {
  CLOUD_STORAGE_CONFIGURATION_PLACEHOLDER,
  CLOUD_STORAGE_SENSITIVE_FIELD_TOKEN,
  CLOUD_STORAGE_READWRITE_ENABLED,
} from "../projectCloudStorage.constants";
import {
  CloudStorage,
  CloudStorageCredential,
} from "../projectCloudStorage.types";
import {
  getCredentialFieldDefinitions,
  parseCloudStorageConfiguration,
} from "../utils/projectCloudStorage.utils";

import LazyRenkuMarkdown from "../../../components/markdown/LazyRenkuMarkdown";
import { useGetNotebooksVersionsQuery } from "../../versions/versionsApi";
import styles from "./AddCloudStorageButton.module.scss";
import { ExternalLink } from "../../../components/ExternalLinks";

export default function AddCloudStorageButton() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => {
    setIsOpen((open) => !open);
  }, []);

  return (
    <>
      <Button className={cx("btn-outline-rk-green")} onClick={toggle}>
        <PlusLg className={cx("bi", "me-1")} />
        Add Cloud Storage
      </Button>
      <AddCloudStorageModal isOpen={isOpen} toggle={toggle} />
    </>
  );
}

interface AddCloudStorageModalProps {
  isOpen: boolean;
  toggle: () => void;
}

function AddCloudStorageModal({ isOpen, toggle }: AddCloudStorageModalProps) {
  const [state, setState] = useState<AddCloudStorageModalState>({
    step: "configuration",
    mode: "simple",
  });
  const toggleAdvanced = useCallback(() => {
    setState((prevState) => {
      if (prevState.step === "credentials") {
        return prevState;
      }
      return {
        ...prevState,
        mode: prevState.mode === "advanced" ? "simple" : "advanced",
      };
    });
  }, []);
  const goToCredentialsStep = useCallback((storageDefinition: CloudStorage) => {
    setState({ step: "credentials", storageDefinition });
  }, []);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setState({ step: "configuration", mode: "simple" });
    }
  }, [isOpen]);

  return (
    <Modal
      backdrop="static"
      centered
      className={styles.modal}
      fullscreen="lg"
      isOpen={isOpen}
      scrollable
      size="lg"
      toggle={toggle}
    >
      <ModalHeader toggle={toggle}>
        <CloudFill className={cx("bi", "me-2")} />
        Add Cloud Storage
      </ModalHeader>
      {state.step === "configuration" && (
        <ModalBody className="flex-shrink-0">
          <div className="form-rk-green">
            <div className={cx("form-check", "form-switch")}>
              <Input
                className={cx("form-check-input", "rounded-pill")}
                checked={state.mode === "advanced"}
                id="addCloudStorageAdvancedSwitch"
                onChange={toggleAdvanced}
                role="switch"
                type="checkbox"
              />
              <Label
                className="form-check-label"
                for="addCloudStorageAdvancedSwitch"
              >
                Advanced mode
              </Label>
            </div>
          </div>
        </ModalBody>
      )}
      {state.step === "credentials" ? (
        <AddCloudStorageCredentialsStep
          storageDefinition={state.storageDefinition}
          toggle={toggle}
        />
      ) : state.mode === "advanced" ? (
        <AdvancedAddCloudStorage
          goToCredentialsStep={goToCredentialsStep}
          toggle={toggle}
        />
      ) : (
        <SimpleAddCloudStorage
          goToCredentialsStep={goToCredentialsStep}
          toggle={toggle}
        />
      )}
    </Modal>
  );
}

type AddCloudStorageModalState =
  | {
      step: "configuration";
      mode: "simple" | "advanced";
    }
  | {
      step: "credentials";
      storageDefinition: CloudStorage;
    };

interface AddCloudStorageProps {
  goToCredentialsStep: (storageDefinition: CloudStorage) => void;
  toggle: () => void;
}

function AdvancedAddCloudStorage({
  goToCredentialsStep,
  toggle,
}: AddCloudStorageProps) {
  const projectId = useSelector<
    RootStateOrAny,
    StateModelProject["metadata"]["id"]
  >((state) => state.stateModel.project.metadata.id);

  const [addCloudStorageForProject, result] =
    useAddCloudStorageForProjectMutation();

  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<AdvancedAddCloudStorageForm>({
    defaultValues: {
      configuration: "",
      name: "",
      private: true,
      readonly: true,
      source_path: "",
    },
  });
  const onSubmit = useCallback(
    (data: AdvancedAddCloudStorageForm) => {
      const configuration = parseCloudStorageConfiguration(data.configuration);
      addCloudStorageForProject({
        configuration,
        name: data.name,
        private: data.private,
        readonly: data.readonly,
        project_id: `${projectId}`,
        source_path: data.source_path,
        target_path: data.name,
      });
    },
    [addCloudStorageForProject, projectId]
  );

  // Handle picking required credentials if necessary
  useEffect(() => {
    if (!result.isSuccess) {
      return;
    }
    if (
      !result.data.storage.private ||
      result.data.sensitive_fields == null ||
      result.data.sensitive_fields.length == 0
    ) {
      toggle();
      return;
    }
    goToCredentialsStep(result.data);
  }, [goToCredentialsStep, result.data, result.isSuccess, toggle]);

  return (
    <>
      <ModalBody>
        <Form
          className="form-rk-green"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          {result.error && <RtkErrorAlert error={result.error} />}

          <div className="form-rk-green">
            <p className="mb-0">
              Advanced mode uses <code>rclone</code> configurations to set up
              cloud storage.
            </p>
            <p className="mb-3">
              Learn more at the{" "}
              <ExternalLink
                url="https://rclone.org/"
                title="rclone documentation"
                role="link"
              />
              .
            </p>

            <div className="mb-3">
              <Label className="form-label" for="addCloudStorageName">
                Name
              </Label>
              <FormText id="addCloudStorageNameHelp" tag="div">
                The name also determines the mount location, though it is
                possible to change it later.
              </FormText>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Input
                    aria-describedby="addCloudStorageNameHelp"
                    className={cx("form-control", errors.name && "is-invalid")}
                    id="addCloudStorageName"
                    placeholder="storage"
                    type="text"
                    {...field}
                  />
                )}
                rules={{ required: true }}
              />
              <div className="invalid-feedback">Please provide a name</div>
            </div>

            <div className="mb-3">
              <Controller
                control={control}
                name="private"
                render={({ field }) => (
                  <Input
                    aria-describedby="addCloudStoragePrivateHelp"
                    className="form-check-input"
                    id="addCloudStoragePrivate"
                    type="checkbox"
                    checked={field.value}
                    innerRef={field.ref}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
              <Label
                className={cx("form-check-label", "ms-2")}
                for="addCloudStoragePrivate"
              >
                Requires credentials
              </Label>
              <FormText id="addCloudStoragePrivateHelp" tag="div">
                Check this box if this cloud storage requires credentials to be
                used.
              </FormText>
            </div>

            {!CLOUD_STORAGE_READWRITE_ENABLED ? null : (
              <div className="mb-3">
                <div className="form-label">Mode</div>
                <Controller
                  control={control}
                  name="readonly"
                  render={({ field }) => (
                    <>
                      <div className="form-check">
                        <Input
                          type="radio"
                          className="form-check-input"
                          name="readonlyRadio"
                          id="addCloudStorageReadOnly"
                          autoComplete="off"
                          checked={field.value}
                          onBlur={field.onBlur}
                          onChange={() => field.onChange(true)}
                        />
                        <Label
                          className={cx("form-check-label", "ms-2")}
                          for="addCloudStorageReadOnly"
                        >
                          Read-only
                        </Label>
                      </div>
                      <div className="form-check">
                        <Input
                          type="radio"
                          className="form-check-input"
                          name="readonlyRadio"
                          id="addCloudStorageReadWrite"
                          autoComplete="off"
                          checked={!field.value}
                          onBlur={field.onBlur}
                          onChange={() => field.onChange(false)}
                        />
                        <Label
                          className={cx("form-check-label", "ms-2")}
                          for="addCloudStorageReadWrite"
                        >
                          Read/Write
                        </Label>
                      </div>
                    </>
                  )}
                />
              </div>
            )}

            <div className="mb-3">
              <Label className="form-label" for="addCloudStorageSourcePath">
                Source Path
              </Label>
              <Controller
                control={control}
                name="source_path"
                render={({ field }) => (
                  <Input
                    className={cx(
                      "form-control",
                      errors.source_path && "is-invalid"
                    )}
                    id="addCloudStorageSourcePath"
                    placeholder="bucket/folder"
                    type="text"
                    {...field}
                  />
                )}
                rules={{ required: true }}
              />
              <div className="invalid-feedback">
                Please provide a valid source path
              </div>
            </div>

            <div>
              <Label className="form-label" for="addCloudStorageConfig">
                Configuration
              </Label>
              <FormText id="addCloudStorageConfigHelp" tag="div">
                You can paste here the output of{" "}
                <code className="user-select-all">
                  rclone config show &lt;name&gt;
                </code>
                .
              </FormText>
              <Controller
                control={control}
                name="configuration"
                render={({ field }) => (
                  <textarea
                    aria-describedby="addCloudStorageConfigHelp"
                    className={cx(
                      "form-control",
                      errors.configuration && "is-invalid"
                    )}
                    id="addCloudStorageConfig"
                    placeholder={CLOUD_STORAGE_CONFIGURATION_PLACEHOLDER}
                    rows={10}
                    {...field}
                  />
                )}
                rules={{ required: true }}
              />
              <div className="invalid-feedback">
                Please provide a valid <code>rclone</code> configuration
              </div>
            </div>
          </div>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button className="btn-outline-rk-green" onClick={toggle}>
          <XLg className={cx("bi", "me-1")} />
          Close
        </Button>
        <Button
          disabled={result.isLoading}
          onClick={handleSubmit(onSubmit)}
          type="submit"
        >
          {result.isLoading ? (
            <Loader className="me-1" inline size={16} />
          ) : (
            <PlusLg className={cx("bi", "me-1")} />
          )}
          Add Storage
        </Button>
      </ModalFooter>
    </>
  );
}

interface AdvancedAddCloudStorageForm {
  configuration: string;
  name: string;
  private: boolean;
  readonly: boolean;
  source_path: string;
}

function SimpleAddCloudStorage({
  goToCredentialsStep,
  toggle,
}: AddCloudStorageProps) {
  const projectId = useSelector<
    RootStateOrAny,
    StateModelProject["metadata"]["id"]
  >((state) => state.stateModel.project.metadata.id);

  const { data: notebooksVersion } = useGetNotebooksVersionsQuery();
  const support = useMemo(
    () =>
      notebooksVersion != null && notebooksVersion.cloudStorageEnabled.s3
        ? "s3"
        : notebooksVersion != null &&
          notebooksVersion.cloudStorageEnabled.azureBlob
        ? "azure"
        : "none",
    [notebooksVersion]
  );

  const [addCloudStorageForProject, result] =
    useAddCloudStorageForProjectMutation();

  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<SimpleAddCloudStorageForm>({
    defaultValues: {
      name: "",
      endpointUrl: "",
      private: true,
      readonly: true,
    },
  });
  const onSubmit = useCallback(
    (data: SimpleAddCloudStorageForm) => {
      addCloudStorageForProject({
        name: data.name,
        private: data.private,
        project_id: `${projectId}`,
        readonly: data.readonly,
        storage_url: data.endpointUrl,
        target_path: data.name,
      });
    },
    [addCloudStorageForProject, projectId]
  );

  // Handle picking required credentials if necessary
  useEffect(() => {
    if (!result.isSuccess) {
      return;
    }
    if (
      !result.data.storage.private ||
      result.data.sensitive_fields == null ||
      result.data.sensitive_fields.length == 0
    ) {
      toggle();
      return;
    }
    goToCredentialsStep(result.data);
  }, [goToCredentialsStep, result.data, result.isSuccess, toggle]);

  return (
    <>
      <ModalBody>
        <Form
          className="form-rk-green"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          {result.error && <RtkErrorAlert error={result.error} />}

          <div className="form-rk-green">
            <div className="mb-3">
              <Label className="form-label" for="addCloudStorageName">
                Name
              </Label>
              <FormText id="addCloudStorageNameHelp" tag="div">
                The name also determines the mount location, though it is
                possible to change it later.
              </FormText>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Input
                    aria-describedby="addCloudStorageNameHelp"
                    className={cx(errors.name && "is-invalid")}
                    id="addCloudStorageName"
                    placeholder="storage"
                    type="text"
                    {...field}
                  />
                )}
                rules={{ required: true }}
              />
              <div className="invalid-feedback">Please provide a name</div>
            </div>

            <div className="mb-3">
              <Label className="form-label" for="addCloudStorageUrl">
                Endpoint URL
              </Label>
              <FormText id="addCloudStorageUrlHelp" tag="div">
                {support === "s3" ? (
                  <>
                    <p className="mb-0">
                      For AWS S3 buckets, supported URLs are of the form:
                    </p>
                    <ul className={cx("mb-0", "ps-4")}>
                      <li>
                        {"s3://s3.<region>.amazonaws.com/<bucket>/[path]"}
                      </li>
                      <li>
                        {"s3://<bucket>.s3.<region>.amazonaws.com/[path]"}
                      </li>
                      <li>{"s3://<bucket>/"}</li>
                    </ul>
                    <p className="mb-0">
                      For S3-compatible buckets, supported URLs are of the form:
                    </p>
                    <ul className={cx("mb-0", "ps-4")}>
                      <li>{"https://<endpoint>/<bucket>/[path]"}</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="mb-0">
                      Supported Azure Blob Store URLs are of the form:
                    </p>
                    <ul className={cx("mb-0", "ps-4")}>
                      <li>
                        {
                          "azure://<account>.dfs.core.windows.net/<container>/[path]"
                        }
                      </li>
                      <li>
                        {
                          "az://<account>.dfs.core.windows.net/<container>/[path]"
                        }
                      </li>
                      <li>
                        {
                          "azure://<account>.blob.core.windows.net/<container>/[path]"
                        }
                      </li>
                      <li>
                        {
                          "az://<account>.blob.core.windows.net/<container>/[path]"
                        }
                      </li>
                      <li>{"azure://<container>/[path]"}</li>
                      <li>{"az://<container>/[path]"}</li>
                    </ul>
                  </>
                )}
              </FormText>
              <Controller
                control={control}
                name="endpointUrl"
                render={({ field }) => (
                  <Input
                    aria-describedby="addCloudStorageUrlHelp"
                    className={cx(errors.endpointUrl && "is-invalid")}
                    id="addCloudStorageUrl"
                    placeholder={
                      support === "s3"
                        ? "s3://bucket.s3.region.amazonaws.com/"
                        : "azure://account.blob.core.windows.net/container"
                    }
                    type="text"
                    {...field}
                  />
                )}
                rules={{ required: true }}
              />
              <div className="invalid-feedback">Please provide a valid URL</div>
            </div>

            <div className="mb-3">
              <Controller
                control={control}
                name="private"
                render={({ field }) => (
                  <Input
                    aria-describedby="addCloudStoragePrivateHelp"
                    className="form-check-input"
                    id="addCloudStoragePrivate"
                    type="checkbox"
                    checked={field.value}
                    innerRef={field.ref}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                  />
                )}
              />
              <Label
                className={cx("form-check-label", "ms-2")}
                for="addCloudStoragePrivate"
              >
                Requires credentials
              </Label>
              <FormText id="addCloudStoragePrivateHelp" tag="div">
                Check this box if this cloud storage requires credentials to be
                used.
              </FormText>
            </div>

            {!CLOUD_STORAGE_READWRITE_ENABLED ? null : (
              <div>
                <div className="form-label">Mode</div>
                <Controller
                  control={control}
                  name="readonly"
                  render={({ field }) => (
                    <>
                      <div className="form-check">
                        <Input
                          type="radio"
                          className="form-check-input"
                          name="addCloudStorageReadOnlyRadio"
                          id="addCloudStorageReadOnly"
                          autoComplete="off"
                          checked={field.value}
                          onBlur={field.onBlur}
                          onChange={() => field.onChange(true)}
                        />
                        <Label
                          className={cx("form-check-label", "ms-2")}
                          for="addCloudStorageReadOnly"
                        >
                          Read-only
                        </Label>
                      </div>
                      <div className="form-check">
                        <Input
                          type="radio"
                          className="form-check-input"
                          name="addCloudStorageReadOnlyRadio"
                          id="addCloudStorageReadWrite"
                          autoComplete="off"
                          checked={!field.value}
                          onBlur={field.onBlur}
                          onChange={() => field.onChange(false)}
                        />
                        <Label
                          className={cx("form-check-label", "ms-2")}
                          for="addCloudStorageReadWrite"
                        >
                          Read/Write
                        </Label>
                      </div>
                    </>
                  )}
                />
              </div>
            )}
          </div>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button className="btn-outline-rk-green" onClick={toggle}>
          <XLg className={cx("bi", "me-1")} />
          Close
        </Button>
        <Button
          disabled={result.isLoading}
          onClick={handleSubmit(onSubmit)}
          type="submit"
        >
          {result.isLoading ? (
            <Loader className="me-1" inline size={16} />
          ) : (
            <PlusLg className={cx("bi", "me-1")} />
          )}
          Add Storage
        </Button>
      </ModalFooter>
    </>
  );
}

interface SimpleAddCloudStorageForm {
  name: string;
  endpointUrl: string;
  private: boolean;
  readonly: boolean;
}

interface AddCloudStorageCredentialsStepProps {
  storageDefinition: CloudStorage;
  toggle: () => void;
}

function AddCloudStorageCredentialsStep({
  storageDefinition,
  toggle,
}: AddCloudStorageCredentialsStepProps) {
  const { storage } = storageDefinition;
  const { configuration, name, project_id, storage_id } = storage;

  const [updateCloudStorage, result] = useUpdateCloudStorageMutation();

  const { control, handleSubmit } = useForm<AddCloudStorageCredentialsForm>({
    defaultValues: {
      requiredCredentials: getCredentialFieldDefinitions(storageDefinition),
    },
  });
  const { fields: credentialFields } = useFieldArray({
    control,
    name: "requiredCredentials",
  });
  const onSubmit = useCallback(
    (data: AddCloudStorageCredentialsForm) => {
      const updateConfig = data.requiredCredentials.reduce(
        (prev, { name, requiredCredential }) => ({
          ...prev,
          ...(requiredCredential
            ? { [name]: CLOUD_STORAGE_SENSITIVE_FIELD_TOKEN }
            : {}),
        }),
        {} as Record<string, string>
      );

      updateCloudStorage({
        project_id,
        storage_id,
        configuration: {
          ...configuration,
          ...updateConfig,
        },
      });
    },
    [configuration, project_id, storage_id, updateCloudStorage]
  );

  useEffect(() => {
    if (result.isSuccess) {
      toggle();
    }
  }, [result.isSuccess, toggle]);

  return (
    <Form
      className={cx(
        "form-rk-green",
        "d-flex",
        "flex-column",
        "mh-100",
        "overflow-y-hidden"
      )}
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <ModalBody>
        <h5>Credentials</h5>
        <p>
          Please select which credentials are required for the{" "}
          <strong>{name}</strong> cloud storage.
        </p>

        <Container className={cx("form-rk-green", "p-0")} fluid>
          <Row className={cx("row-cols-1", "gy-2")}>
            {credentialFields.map((item, index) => (
              <Col key={item.id}>
                <Card>
                  <CardBody className="pb-0">
                    <Controller
                      control={control}
                      name={`requiredCredentials.${index}.requiredCredential`}
                      render={({ field }) => (
                        <Input
                          aria-describedby={`configureCloudStorageCredentialsHelp-${item.id}`}
                          className="form-check-input"
                          id={`configureCloudStorageCredentials-${item.id}`}
                          type="checkbox"
                          checked={field.value}
                          innerRef={field.ref}
                          onBlur={field.onBlur}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <Label
                      className={cx("form-check-label", "ms-2")}
                      for={`configureCloudStorageCredentials-${item.id}`}
                    >
                      {item.name}
                    </Label>
                    <FormText
                      id={`configureCloudStorageCredentialsHelp-${item.id}`}
                      tag="div"
                    >
                      <LazyRenkuMarkdown markdownText={item.help} />
                    </FormText>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </ModalBody>
      <ModalFooter>
        <Button disabled={result.isLoading} type="submit">
          {result.isLoading ? (
            <Loader className="me-1" inline size={16} />
          ) : (
            <CheckLg className={cx("bi", "me-1")} />
          )}
          Finish cloud storage setup
        </Button>
      </ModalFooter>
    </Form>
  );
}

interface AddCloudStorageCredentialsForm {
  requiredCredentials: CloudStorageCredential[];
}
