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

import React from "react";
import type { Params } from "../App.types";
import { RenkuQueryParams } from "./Authentication.container";

function createLoginUrl(url: string) {
  const redirectUrl = new URL(url);
  if (!redirectUrl.search.includes(RenkuQueryParams.login))
    redirectUrl.searchParams.append(
      RenkuQueryParams.login,
      RenkuQueryParams.loginValue
    );

  return redirectUrl.toString();
}

type LocationRedirectProps = {
  params: Params;
  location: {
    state?: {
      previous?: string;
    };
  };
};

function LoginRedirect({ location, params }: LocationRedirectProps) {
  React.useEffect(() => {
    // build redirect url
    let url = params.BASE_URL;
    // always pass "previous" with the current `location.pathname`
    if (location.state && location.state.previous)
      url += location.state.previous;
    const redirectParam = encodeURIComponent(createLoginUrl(url));
    const uiServerUrl = params.UISERVER_URL;
    const authUrl = `${uiServerUrl}/auth/login?redirect_url=${redirectParam}`;

    // set new location
    window.location.replace(authUrl);
  });
  return <div className="bg-primary h-100"></div>;
}

export default LoginRedirect;

// For testing
export { createLoginUrl };
