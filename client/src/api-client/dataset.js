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
import {
  addMarqueeImageToDataset,
  cleanDatasetId,
} from "../utils/helpers/Dataset.utils";

export default function addDatasetMethods(client) {
  function createFileUploadFormData(file) {
    const data = new FormData();
    data.append("file", file);
    return data;
  }

  const uploadFileHeaders = {
    credentials: "same-origin",
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
  };

  client.uploadFile = (
    versionUrl = null,
    file,
    unpack_archive = false,
    setFileProgress,
    thenCallback,
    onErrorCallback,
    setController,
    onFileUploadEnd
  ) => {
    const data = createFileUploadFormData(file);
    data.append("processData", false);

    let currentPercentCompleted = -1;
    let httpRequest = new XMLHttpRequest();

    const urlString = client.versionedCoreUrl("cache.files_upload", versionUrl);
    const url = new URL(urlString);
    url.search = new URLSearchParams({
      override_existing: true,
      unpack_archive,
    }).toString();

    httpRequest.open("POST", url);
    for (const [key, value] of Object.entries(uploadFileHeaders))
      httpRequest.setRequestHeader(key, value);

    httpRequest.upload.addEventListener("progress", function (e) {
      let percent_completed = Math.round((e.loaded / e.total) * 100).toFixed();
      if (currentPercentCompleted !== percent_completed) {
        currentPercentCompleted = percent_completed;
        setFileProgress(file, percent_completed);
      }
    });

    httpRequest.onloadstart = function () {
      setController(file, httpRequest);
    };

    httpRequest.onloadend = function () {
      if (httpRequest.status === 200 && httpRequest.response) {
        if (onFileUploadEnd) onFileUploadEnd();
        let jsonResponse = JSON.parse(httpRequest.response);

        if (jsonResponse.error) setFileProgress(file, 400, jsonResponse.error);
        else setFileProgress(file, 101);
        thenCallback(jsonResponse);
      } else if (httpRequest.status >= 400) {
        setFileProgress(file, 400, {
          error: { reason: "Server Error " + httpRequest.status },
        });
        if (onFileUploadEnd) onFileUploadEnd();
        onErrorCallback({ code: httpRequest.status });
      }
    };

    return httpRequest.send(data);
  };

  client.uploadSingleFile = async (
    file,
    unpack_archive = false,
    versionUrl = null
  ) => {
    const headers = new Headers(uploadFileHeaders);
    const data = createFileUploadFormData(file);
    const queryParams = {
      override_existing: true,
      unpack_archive: unpack_archive,
    };

    const url = client.versionedCoreUrl("cache.files_upload", versionUrl);
    return client.clientFetch(url, {
      method: "POST",
      headers,
      body: data,
      queryParams,
      processData: false,
    });
  };

  client.datasetImport = (projectUrl, datasetUrl, versionUrl = null) => {
    let headers = client.getBasicHeaders();
    headers.append("Content-Type", "application/json");
    headers.append("X-Requested-With", "XMLHttpRequest");

    const url = client.versionedCoreUrl("datasets.import", versionUrl);

    return client.clientFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        dataset_uri: datasetUrl,
        git_url: projectUrl,
      }),
    });
  };

  client.listProjectDatasetsFromCoreService = (
    git_url,
    versionUrl = null,
    defaultBranch
  ) => {
    let headers = client.getBasicHeaders();
    headers.append("Content-Type", "application/json");
    headers.append("X-Requested-With", "XMLHttpRequest");

    const url = client.versionedCoreUrl("datasets.list", versionUrl);
    const queryParams = { git_url };

    return client
      .clientFetch(url, {
        method: "GET",
        headers,
        queryParams,
      })
      .then((response) => {
        if (response.data.result && response.data.result.datasets.length > 0) {
          response.data.result.datasets.map((d) =>
            addMarqueeImageToDataset(git_url, cleanDatasetId(d), defaultBranch)
          );
        }

        return response;
      })
      .catch((error) => ({
        data: { error: { reason: error.case } },
      }));
  };

  client.fetchDatasetFilesFromCoreService = (
    name,
    git_url,
    versionUrl = null
  ) => {
    let headers = client.getBasicHeaders();
    headers.append("Content-Type", "application/json");
    headers.append("X-Requested-With", "XMLHttpRequest");

    const url = client.versionedCoreUrl("datasets.files_list", versionUrl);
    const queryParams = { git_url, name };

    const filesPromise = client
      .clientFetch(url, {
        method: "GET",
        headers,
        queryParams,
      })
      .catch((error) => ({
        data: { error: { reason: error.case } },
      }));
    return Promise.resolve(filesPromise);
  };
}
