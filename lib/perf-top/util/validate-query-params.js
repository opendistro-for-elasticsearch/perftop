/*
 * Copyright <2019> Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/**
 * Validate that query parameters are valid for Bar graphs.
 *
 * @param {string} queryParams - user-defined query parameter.
 */
function validateBarQueryParams (queryParams) {
  if (queryParams.metrics.split(',').length > 1) {
    console.error('Only one metric is supported for bar graphs.');
  }
  if (queryParams.dimensions.split(',').length > 1) {
    console.error('Only one dimension is supported for bar graphs.');
  }
}

/**
 * Validate that query parameters are valid for Linw graphs.
 *
 * @param {string} queryParams - user-defined query parameter.
 */
function validateLineQueryParams (queryParams) {
  if (queryParams.metrics.split(',').length > 1) {
    console.error('Only one metric is supported for bar graphs.');
  }
  if (queryParams.dimensions.split(',').length > 1) {
    console.error('Only one dimension is supported for bar graphs.');
  }
}

/**
 * Validate that query parameters are valid for table graphs.
 *
 * @param {string} queryParams - user-defined query parameter.
 */
function validateTableQueryParams (queryParams) {
  if (!queryParams.sortBy) {
    console.error('Provide "sortBy" field for the table graph.');
  }
}

module.exports.validateTableQueryParams = validateTableQueryParams;
module.exports.validateBarQueryParams = validateBarQueryParams;
module.exports.validateLineQueryParams = validateLineQueryParams;
