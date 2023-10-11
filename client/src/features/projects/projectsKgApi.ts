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
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  EditAvatarProjectParams,
  EditProjectParams,
  KgMetadataResponse,
  ProjectKgParams,
  UpdateProjectResponse,
} from "../project/Project";

type JsonLdValue<T> = {
  "@value": T;
};

type JsonLdDate = {
  "@type": string;
  "@value": string;
};

type KgJsonLdResponse = {
  "@id": string;
  "@type": string[];
  "https://swissdatasciencecenter.github.io/renku-ontology#projectPath": JsonLdValue<string>;
  "http://schema.org/description": JsonLdValue<string>;
  "http://schema.org/dateModified": JsonLdDate;
  "http://schema.org/identifier": JsonLdValue<number>;
  "http://schema.org/creator": {
    "@id": string;
    "@type": string[];
    "http://schema.org/email": JsonLdValue<string>;
    "http://schema.org/name": JsonLdValue<string>;
  };
  "http://schema.org/schemaVersion": JsonLdValue<string>;
  "https://swissdatasciencecenter.github.io/renku-ontology#projectVisibility": JsonLdValue<string>;
  "http://schema.org/name": JsonLdValue<string>;
  "http://schema.org/image": string[];
  "http://schema.org/keywords": string[];
};

type ProjectKgContent = "ld+json" | "json";

interface ProjectKgWithIdParams extends ProjectKgParams {
  projectId?: number;
}

export function kgProjectRequestHeaders(content: ProjectKgContent) {
  return {
    Accept: `application/${content}`,
  };
}

export const projectsKgApi = createApi({
  reducerPath: "projectKgApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/ui-server/api/kg" }),
  tagTypes: ["project-kg-metadata"],
  endpoints: (builder) => ({
    projectJsonLd: builder.query<KgJsonLdResponse, ProjectKgParams>({
      query: (params) => ({
        url: `projects/${params.projectPath}`,
        headers: kgProjectRequestHeaders("ld+json"),
      }),
    }),
    projectMetadata: builder.query<KgMetadataResponse, ProjectKgWithIdParams>({
      query: (params) => ({
        url: `projects/${params.projectPath}`,
        headers: kgProjectRequestHeaders("json"),
      }),
      providesTags: (result, error, params) => [
        { type: "project-kg-metadata", id: params.projectId },
      ],
    }),
    updateProject: builder.mutation<UpdateProjectResponse, EditProjectParams>({
      query: ({ projectPathWithNamespace, project }) => {
        return {
          method: "PATCH",
          url: `projects/${projectPathWithNamespace}`,
          body: {
            ...project,
          },
        };
      },
      invalidatesTags: (result, err, args) => [
        { type: "project-kg-metadata", id: args.projectId },
      ],
    }),
    updateAvatarProject: builder.mutation<
      UpdateProjectResponse,
      EditAvatarProjectParams
    >({
      query: ({ projectPathWithNamespace, avatar }) => {
        const bodyFormData = new FormData();
        bodyFormData.append("image", avatar);
        return {
          method: "PATCH",
          url: `projects/${projectPathWithNamespace}`,
          body: bodyFormData,
          formData: true,
        };
      },
      invalidatesTags: (result, err, args) => [
        { type: "project-kg-metadata", id: args.projectId },
      ],
    }),
  }),
});

// Export hooks for usage in function components, which are
// auto-generated based on the defined endpoints
export const {
  useProjectJsonLdQuery,
  useProjectMetadataQuery,
  useUpdateProjectMutation,
  useUpdateAvatarProjectMutation,
} = projectsKgApi;
export type { ProjectKgContent };
