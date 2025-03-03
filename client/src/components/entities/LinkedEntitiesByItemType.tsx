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

import { ReactNode, useRef } from "react";
import { Briefcase, HddStack } from "react-bootstrap-icons";
import { Link } from "react-router-dom";
import { UncontrolledTooltip } from "reactstrap";
import { stylesByItemType } from "../../utils/helpers/HelperFunctions";
import { LoadingLabel } from "../formlabels/FormLabels";
import { EntityType } from "./Entities";
import "./Entities.css";

/**
 *  renku-ui
 *
 *  Entity Label.tsx
 *  Entity Label component
 */

export interface EntityLinksData {
  url: string;
  title: string;
  tooltip?: string;
}
export interface EntityLinksHeader {
  data: EntityLinksData[];
  status: "pending" | "done" | "error";
  total: number;
  linkAll: string;
}

export interface LinkedEntitiesByItemTypeProps {
  devAccess: boolean;
  itemType: EntityType;
  links?: EntityLinksHeader;
  url: string;
}
function LinkedEntitiesByItemType({
  devAccess,
  itemType,
  links,
  url,
}: LinkedEntitiesByItemTypeProps) {
  if (!links) return null;

  const dataByItem = {
    project: {
      title: "Linked datasets",
      description: "Main datasets used in this project",
      seeMore: "See more datasets...",
      noLinks: "No dataset has been added yet.",
      error: "Error obtaining datasets",
      icon: <HddStack />,
    },
    dataset: {
      title: "Linked projects",
      description: "Projects that use this dataset",
      seeMore: "... see more projects in the section below",
      noLinks: "There are no projects using this dataset.",
      error: "Error obtaining projects",
      icon: <Briefcase />,
    },
    workflow: {
      title: "Linked composite workflows",
      description: "Composite workflows that use this workflow",
      seeMore: "",
      noLinks: "There are no composite workflows using this workflow.",
      error: "Error obtaining related workflows",
      icon: <Briefcase />,
    },
  };

  const addDatasetLink =
    devAccess && itemType === "project" ? (
      <div className="">
        <Link to={`${url}/datasets/new`} title="Add a dataset">
          Add a dataset...
        </Link>
      </div>
    ) : null;

  return (
    <div className="linked-entities">
      <h3>{dataByItem[itemType].title}</h3>
      <p className="text-rk-text-light mb-1">
        {dataByItem[itemType].description}
      </p>
      {links.status === "pending" ? (
        <LoadingLabel text="Loading links... " />
      ) : null}
      {links.status === "error" ? (
        <small className="text-rk-text-light">
          {dataByItem[itemType].error}.{" "}
          {links.linkAll ? (
            <Link
              className="cursor-pointer text-rk-text-light"
              key="more-datasets"
              to={links.linkAll}
            >
              More info
            </Link>
          ) : null}
        </small>
      ) : null}
      {links.data.map((link) => (
        <LinkedItem
          key={link.url}
          link={link}
          itemType={itemType}
          icon={dataByItem[itemType].icon}
        />
      ))}
      {links.total > 3 ? (
        <SeeMoreByType
          itemType={itemType}
          text={dataByItem[itemType].seeMore}
          linkTo={links.linkAll}
        />
      ) : null}
      {links.status === "done" && links.data.length === 0 ? (
        <small className="text-rk-text-light">
          {dataByItem[itemType].noLinks} {addDatasetLink}
        </small>
      ) : null}
    </div>
  );
}

interface SeeMoreByTypeProps {
  itemType: EntityType;
  text: string;
  linkTo?: string;
}
function SeeMoreByType({ itemType, text, linkTo }: SeeMoreByTypeProps) {
  switch (itemType) {
    case "project":
      return (
        <div className="mt-1">
          {linkTo ? (
            <Link
              className="cursor-pointer text-rk-text-light"
              key="more-datasets"
              to={linkTo}
            >
              {text}
            </Link>
          ) : null}
        </div>
      );
    case "dataset":
      return (
        <div className="mt-1">
          <small className="text-rk-text-light">{text}</small>
        </div>
      );
    default:
      return null;
  }
}

interface LinkedItemProps {
  icon: ReactNode;
  itemType: EntityType;
  link: EntityLinksData;
}
function LinkedItem({ icon, itemType, link }: LinkedItemProps) {
  const stylesByItem = stylesByItemType(itemType);
  const linkRef = useRef(null);
  return (
    <>
      <div className="d-flex" key={link.title}>
        <Link
          ref={linkRef}
          className={`${stylesByItem.colorText} linked-entities-link text-truncate`}
          to={link.url}
        >
          {icon}
          {link.title}
        </Link>
      </div>
      {link.tooltip && (
        <UncontrolledTooltip target={linkRef}>
          {link.tooltip}
        </UncontrolledTooltip>
      )}
    </>
  );
}
export default LinkedEntitiesByItemType;
