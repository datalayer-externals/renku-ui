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
 *  Privacy.present.js
 *  Presentational components for privacy.
 */

import { Component } from "react";
import CookieConsent from "react-cookie-consent";
import { WarnAlert } from "../components/Alert";
import LazyRenkuMarkdown from "../components/markdown/LazyRenkuMarkdown";

/**
 * Return the HTML content with support for react routing
 *
 * @param {Object} params - parameters object for renku-ui.
 * @param {Object} history - react history object for the local routing
 */
class CookieBanner extends Component {
  render() {
    const { layout, content } = this.props;

    return <CookieConsent {...layout}>{content}</CookieConsent>;
  }
}

class Privacy extends Component {
  render() {
    const { content } = this.props;
    if (!content || !content.length) {
      return <WarnAlert>There is no content for this page.</WarnAlert>;
    }

    const stringContent = atob(content);
    return <LazyRenkuMarkdown markdownText={stringContent} />;
  }
}

export { CookieBanner, Privacy };
