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

import { CloudStorageDefinitionForSessionApi } from "./sessions.types";
import { SessionCloudStorage } from "./startSessionOptions.types";

export function convertCloudStorageForSessionApi(
  cloudStorage: SessionCloudStorage
): CloudStorageDefinitionForSessionApi | null {
  const {
    configuration,
    readonly,
    sensitive_fields,
    source_path,
    storage_type,
    target_path,
  } = cloudStorage;

  if (storage_type === "s3" || configuration["type"] === "s3") {
    const endpoint =
      configuration["endpoint"] && configuration["endpoint"].startsWith("http")
        ? configuration["endpoint"]
        : configuration["endpoint"]
        ? `https://${configuration["endpoint"]}`
        : configuration["region"]
        ? `https://s3.${configuration["region"]}.amazonaws.com`
        : "https://s3.amazonaws.com";

    return {
      configuration: {
        type: "s3",
        endpoint,
        access_key_id: sensitive_fields?.find(
          ({ name }) => name === "access_key_id"
        )?.value,
        secret_access_key: sensitive_fields?.find(
          ({ name }) => name === "secret_access_key"
        )?.value,
      },
      readonly,
      source_path,
      target_path,
    };
  }

  if (storage_type === "azureblob" || configuration["type"] === "azureblob") {
    return {
      configuration: {
        type: "azureblob",
        endpoint: configuration["account"] ?? "",
        secret_access_key:
          sensitive_fields?.find(({ name }) => name === "secret_access_key")
            ?.value ?? "",
      },
      readonly,
      source_path,
      target_path,
    };
  }

  return null;
}
