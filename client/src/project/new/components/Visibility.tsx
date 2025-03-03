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
/**
 *  renku-ui
 *
 *  Visibility.js
 *  Visibility field group component
 */
import { ReactNode, useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  FormGroup,
  Modal,
  ModalBody,
  ModalHeader,
} from "reactstrap";
import { SuccessAlert } from "../../../components/Alert";
import { ExternalLink } from "../../../components/ExternalLinks";
import { Loader } from "../../../components/Loader";
import { RtkErrorAlert } from "../../../components/errors/RtkErrorAlert";
import { LoadingLabel } from "../../../components/formlabels/FormLabels";
import VisibilitiesInput, {
  VISIBILITY_ITEMS,
  Visibilities,
} from "../../../components/visibility/Visibility";
import { SettingRequiresKg } from "../../../features/project/components/ProjectSettingsUtils";
import { useGetProjectByIdQuery } from "../../../features/project/projectGitLab.api";
import {
  useGetProjectIndexingStatusQuery,
  useProjectMetadataQuery,
  useUpdateProjectMutation,
} from "../../../features/project/projectKg.api";
import { useGetGroupByPathQuery } from "../../../features/projects/projectsApi";
import { GitlabLinks } from "../../../utils/constants/Docs";
import { computeVisibilities } from "../../../utils/helpers/HelperFunctions";
import {
  NewProjectHandlers,
  NewProjectInputs,
  NewProjectMeta,
} from "./newProject.d";

interface VisibilityProps {
  handlers: NewProjectHandlers;
  meta: NewProjectMeta;
  input: NewProjectInputs;
}

export default function Visibility({ handlers, meta, input }: VisibilityProps) {
  const error = meta.validation.errors["visibility"];

  return (
    <FormGroup className="field-group">
      <VisibilitiesInput
        isLoadingData={
          meta.namespace.fetching ||
          !meta.namespace.visibilities ||
          !input.visibility
        }
        namespaceVisibility={meta.namespace.visibility}
        isInvalid={!!error && !input.visibilityPristine}
        data-cy="visibility-select"
        isRequired={true}
        onChange={(value: string) => handlers.setProperty("visibility", value)}
        value={input.visibility ?? null}
      />
    </FormGroup>
  );
}

interface EditVisibilityModalConfirmationProps {
  onConfirm: (visibility: Visibilities) => void;
  toggleModal: () => void;
  isOpen: boolean;
  isError: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  message: ReactNode;
  visibility?: Visibilities | null;
}

function EditVisibilityModalConfirmation({
  isOpen,
  toggleModal,
  onConfirm,
  isError,
  isLoading,
  isSuccess,
  message,
  visibility = null,
}: EditVisibilityModalConfirmationProps) {
  const buttons = !isError && !isLoading && !isSuccess && (
    <div className="mt-2 d-flex flex-row gap-2 justify-content-end">
      <Button
        className="float-right mt-1 btn-outline-rk-green"
        onClick={toggleModal}
        data-cy="cancel-visibility-btn"
      >
        Cancel
      </Button>
      <Button
        className="float-right mt-1 btn-rk-green"
        onClick={() => onConfirm(visibility as Visibilities)}
        data-cy="update-visibility-btn"
      >
        Agree
      </Button>
    </div>
  );

  const modalContent =
    visibility === Visibilities.Private
      ? "Users will not find this project anymore unless you explicitly add them to the Members list. "
      : "Please note that users will not need your explicit permission to see this project. ";
  const content =
    isError || isSuccess ? (
      message
    ) : isLoading ? (
      <LoadingLabel text="Updating visibility" />
    ) : (
      <>
        {modalContent}
        Check the{" "}
        <ExternalLink
          url={GitlabLinks.PROJECT_VISIBILITY}
          role="text"
          title="visibility documentation"
        />{" "}
        for more details.
      </>
    );

  return (
    <Modal isOpen={isOpen} toggle={() => toggleModal()} size="lg">
      <ModalHeader toggle={() => toggleModal()}>
        Change visibility to{" "}
        {VISIBILITY_ITEMS.find((item) => item.value === visibility)?.title}
      </ModalHeader>
      <ModalBody>
        {content}
        {buttons}
      </ModalBody>
    </Modal>
  );
}

interface EditVisibilityProps {
  forkedProjectId?: number;
  isMaintainer: boolean;
  namespace: string;
  namespaceKind: string;
  pathWithNamespace: string;
  projectId: number;
}

export function EditVisibility({
  forkedProjectId,
  isMaintainer,
  namespace,
  namespaceKind,
  pathWithNamespace,
  projectId,
}: EditVisibilityProps) {
  const [
    updateProject,
    { isLoading: isLoadingMutation, isSuccess, isError, error, reset },
  ] = useUpdateProjectMutation();
  const {
    data: projectData,
    isFetching: isFetchingProject,
    isLoading: isLoadingProject,
    refetch: refetchProjectData,
  } = useProjectMetadataQuery(
    { projectPath: pathWithNamespace },
    { skip: !pathWithNamespace }
  );
  const {
    data: forkProjectData,
    isFetching: isFetchingForkProject,
    isLoading: isLoadingForkProject,
  } = useGetProjectByIdQuery(forkedProjectId ?? 0, {
    skip: !forkedProjectId,
  });
  const {
    data: namespaceData,
    isFetching: isFetchingNamespace,
    isLoading: isLoadingNamespace,
  } = useGetGroupByPathQuery(namespace, {
    skip: namespaceKind !== "group",
  });

  const { data: indexingStatusData, isLoading: isLoadingIndexingStatus } =
    useGetProjectIndexingStatusQuery(projectId, {
      skip: !projectId,
    });

  const [isOpen, setIsOpen] = useState(false);
  const [newVisibility, setNewVisibility] = useState<Visibilities>();
  const [availableVisibilities, setAvailableVisibilities] = useState(
    computeVisibilities([])
  );

  useEffect(() => {
    const namespaces = [];
    if (!isFetchingForkProject && !isLoadingForkProject && forkProjectData)
      namespaces.push(forkProjectData.visibility);
    if (!isFetchingNamespace && !isLoadingNamespace && namespaceData)
      namespaces.push(namespaceData.visibility);
    setAvailableVisibilities(computeVisibilities(namespaces));
  }, [
    isFetchingForkProject,
    isLoadingForkProject,
    forkProjectData,
    isFetchingNamespace,
    isLoadingNamespace,
    namespaceData,
  ]);

  useEffect(() => {
    if (projectData) setNewVisibility(projectData.visibility);
  }, [projectData]);

  const onConfirm = useCallback(
    (newVisibility: Visibilities) => {
      if (projectData)
        updateProject({
          projectPathWithNamespace: projectData.path,
          project: { visibility: newVisibility },
          projectId,
        });
    },
    [projectData, updateProject, projectId]
  );

  const onChange = useCallback(
    (visibility: Visibilities) => {
      if (newVisibility !== visibility) {
        setIsOpen(true);
        setNewVisibility(visibility);
      }
    },
    [setIsOpen, setNewVisibility, newVisibility]
  );

  const onCancel = useCallback(() => {
    setIsOpen(!isOpen);
    reset();
    if (!isSuccess) {
      setNewVisibility(projectData?.visibility);
    } else {
      refetchProjectData(); //make sure the visibility is updated
    }
  }, [isOpen, isSuccess, projectData?.visibility, refetchProjectData, reset]);

  const message =
    isError && error ? (
      <RtkErrorAlert
        error={error}
        dismissible={false}
        property="visibility_level"
      />
    ) : isSuccess ? (
      <SuccessAlert dismissible={false} timeout={0}>
        The visibility of the project has been modified
      </SuccessAlert>
    ) : (
      ""
    );

  const isLoadingQueries =
    isLoadingNamespace || isLoadingProject || isLoadingIndexingStatus;

  const content = isLoadingQueries ? (
    <>
      <div className="form-label">Visibility</div>
      <Loader className="ms-2" inline size={16} />
    </>
  ) : !indexingStatusData?.activated ? (
    <>
      <div className="form-label">Visibility</div>
      <SettingRequiresKg />
    </>
  ) : (
    <VisibilitiesInput
      data-cy="edit-visibility-select"
      disabled={!isMaintainer}
      includeRequiredLabel={false}
      isForked={!!forkedProjectId}
      isInvalid={isError}
      isLoadingData={
        isFetchingProject || !projectData?.visibility || isFetchingForkProject
      }
      isRequired={true}
      namespaceVisibility={availableVisibilities.default as Visibilities}
      onChange={onChange}
      value={newVisibility || projectData?.visibility}
    />
  );

  return (
    <div className="form-rk-green">
      <Card className="mb-4 ">
        <CardBody>{content}</CardBody>
      </Card>

      <EditVisibilityModalConfirmation
        isError={isError}
        isLoading={isLoadingMutation}
        isOpen={isOpen}
        isSuccess={isSuccess}
        message={message}
        onConfirm={onConfirm}
        toggleModal={onCancel}
        visibility={newVisibility || projectData?.visibility}
      />
    </div>
  );
}
