<template>
  <div class="project-detail">
    <div v-if="!project" class="loading">로딩 중...</div>

    <template v-else>
      <header class="page-header">
        <div class="header-left">
          <button class="btn-back" @click="goHome" title="홈으로">
            ← 홈
          </button>
          <div>
            <h1>{{ project.name }}</h1>
            <p class="subtitle">{{ project.swaggerUrl }}</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" :disabled="isLoading" @click="handleCheck">
            {{ isLoading ? '체크 중...' : '지금 체크하기' }}
          </button>
          <button class="btn btn-secondary" @click="showEditModal = true">
            수정
          </button>
          <button class="btn btn-danger" @click="showDeleteDialog = true">
            삭제
          </button>
        </div>
      </header>

      <Teleport to="body">
        <ProjectFormModal v-if="showEditModal" :project="project" @close="showEditModal = false"
          @update="handleUpdate" />

        <ConfirmDialog v-if="showDeleteDialog" :message="`'${project.name}' 프로젝트를 삭제하시겠습니까?`"
          :description="'이 작업은 되돌릴 수 없으며, 모든 스냅샷과 변경 내역이 함께 삭제됩니다.'" confirm-text="삭제" cancel-text="취소"
          @confirm="handleDeleteConfirm" @cancel="showDeleteDialog = false" />
      </Teleport>

      <div class="content">
        <div class="info-section">
          <h2>프로젝트 정보</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">마지막 체크</span>
              <span class="value">{{ lastCheckedText }}</span>
            </div>
            <div class="info-item">
              <span class="label">스냅샷 수</span>
              <span class="value">{{ snapshots.length }}개</span>
            </div>
            <div class="info-item">
              <span class="label">최신 버전</span>
              <span class="value">{{ latestVersion || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">총 API 개수</span>
              <span class="value">{{ apiEndpoints.length }}개</span>
            </div>
          </div>
        </div>

        <div class="api-list-section">
          <div class="section-header" @click="toggleApiList">
            <div class="header-title">
              <h2>API 목록</h2>
              <span v-if="apiEndpoints.length > 0" class="api-count">
                총 {{ apiEndpoints.length }}개 엔드포인트
              </span>
            </div>
            <div class="section-header-actions" @click.stop>
              <button class="authorize-btn" :class="{ active: showAuthorizePanel }"
                @click.stop="showAuthorizePanel = !showAuthorizePanel">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round" width="14" height="14">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Authorize
              </button>
            </div>
            <button class="toggle-btn" :class="{ expanded: showApiList }">
              <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <!-- Authorize 패널 -->
          <div v-if="showAuthorizePanel" class="authorize-panel" @click.stop>
            <div class="authorize-panel-header">
              <h4>Authorize</h4>
              <button class="authorize-close-btn" @click.stop="showAuthorizePanel = false">✕</button>
            </div>
            <div class="authorize-fields">
              <div class="authorize-field">
                <label>Bearer Token</label>
                <div class="authorize-input-row">
                  <input v-model="authConfig.bearerToken" type="text" placeholder="JWT 토큰 입력 (Bearer 제외)"
                    class="authorize-input" @click.stop />
                  <button v-if="authConfig.bearerToken" class="authorize-clear-btn"
                    @click.stop="authConfig.bearerToken = ''">지우기</button>
                </div>
              </div>
              <div class="authorize-field">
                <label>API Key</label>
                <div class="authorize-input-row">
                  <input v-model="authConfig.apiKeyHeader" type="text" placeholder="헤더명 (예: X-API-Key)"
                    class="authorize-input authorize-input-sm" @click.stop />
                  <input v-model="authConfig.apiKey" type="text" placeholder="API Key 값" class="authorize-input"
                    @click.stop />
                  <button v-if="authConfig.apiKey" class="authorize-clear-btn"
                    @click.stop="authConfig.apiKey = ''">지우기</button>
                </div>
              </div>
            </div>
            <div class="authorize-panel-footer">
              <span class="authorize-status">
                <template v-if="authConfig.bearerToken || authConfig.apiKey">
                  <span class="status-dot active" /> 인증 설정됨
                </template>
                <template v-else>
                  <span class="status-dot" /> 인증 없음
                </template>
              </span>
              <button class="btn btn-secondary btn-sm" @click.stop="showAuthorizePanel = false">닫기</button>
            </div>
          </div>

          <div v-if="apiEndpoints.length === 0" class="empty-state">
            아직 스냅샷이 없습니다. "지금 체크하기"를 눌러 API 정보를 가져오세요.
          </div>

          <div v-else-if="showApiList" class="api-list">
            <!-- 태그별로 그룹화된 API 목록 -->
            <div v-for="(group, tagName) in groupedApiEndpoints" :key="tagName" class="tag-group">
              <div class="tag-header" @click.stop="toggleTagGroup(tagName)">
                <div class="tag-info">
                  <h3>{{ tagName }}</h3>
                  <span class="tag-count">{{ group.length }}개</span>
                </div>
                <div class="tag-expand-icon" :class="{ expanded: expandedTags.has(tagName) }">
                  <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>

              <div v-if="expandedTags.has(tagName)" class="tag-apis">
                <div v-for="(endpoint, index) in group" :key="`${tagName}-${index}`" class="api-item"
                  :class="[{ expanded: expandedApiKeys.has(`${tagName}-${index}`) }, `api-item-${endpoint.method.toLowerCase()}`]"
                  @click.stop="toggleApiDetail(`${tagName}-${index}`)">
                  <div class="api-main">
                    <div class="api-method" :class="`method-${endpoint.method.toLowerCase()}`">
                      {{ endpoint.method.toUpperCase() }}
                    </div>
                    <div class="api-info">
                      <div class="api-path">{{ endpoint.path }}</div>
                      <div v-if="endpoint.summary" class="api-summary">
                        {{ endpoint.summary }}
                      </div>
                    </div>
                    <div class="api-actions">
                      <button
                        type="button"
                        class="api-copy-btn"
                        :class="{ copied: getCopyState(`api-path-${tagName}-${index}`) === 'copied' }"
                        title="API 주소 복사"
                        @click.stop="copyApiAddress(`${tagName}-${index}`, endpoint, $event)"
                      >
                        <svg class="clipboard-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <div class="api-expand-icon" :class="{ expanded: expandedApiKeys.has(`${tagName}-${index}`) }">
                        <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                          stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div v-if="expandedApiKeys.has(`${tagName}-${index}`)" class="api-details" @click.stop>

                    <!-- Try it out 버튼 -->
                    <div class="try-it-out-header">
                      <button class="try-it-out-btn" :class="{ active: tryItOutMap[`${tagName}-${index}`] }"
                        @click.stop="toggleTryItOut(`${tagName}-${index}`, endpoint)">
                        {{ tryItOutMap[`${tagName}-${index}`] ? 'Cancel' : 'Try it out' }}
                      </button>
                    </div>

                    <!-- Try it out 폼 -->
                    <div v-if="tryItOutMap[`${tagName}-${index}`] && tryItOutValues[`${tagName}-${index}`]"
                      class="try-it-out-form">

                      <!-- Path Parameters -->
                      <template v-if="getParamsByIn(endpoint, 'path').length > 0">
                        <div class="tio-section-title">Path Parameters</div>
                        <div v-for="param in getParamsByIn(endpoint, 'path')" :key="param.name" class="tio-param-row">
                          <label class="tio-label">
                            {{ param.name }}
                            <span v-if="param.required" class="tio-required">*</span>
                            <span class="tio-in-badge">path</span>
                          </label>
                          <input v-model="tryItOutValues[`${tagName}-${index}`].pathParams[param.name]" type="text"
                            class="tio-input" :placeholder="param.schema?.example ?? param.description ?? param.name"
                            @click.stop />
                          <span v-if="param.description" class="tio-desc">{{ param.description }}</span>
                        </div>
                      </template>

                      <!-- Query Parameters -->
                      <template v-if="getParamsByIn(endpoint, 'query').length > 0">
                        <div class="tio-section-title">Query Parameters</div>
                        <div v-for="param in getParamsByIn(endpoint, 'query')" :key="param.name" class="tio-param-row">
                          <label class="tio-label">
                            {{ param.name }}
                            <span v-if="param.required" class="tio-required">*</span>
                            <span class="tio-in-badge">query</span>
                          </label>
                          <input v-model="tryItOutValues[`${tagName}-${index}`].queryParams[param.name]" type="text"
                            class="tio-input" :placeholder="param.schema?.example ?? param.description ?? ''"
                            @click.stop />
                          <span v-if="param.description" class="tio-desc">{{ param.description }}</span>
                        </div>
                      </template>

                      <!-- Header Parameters -->
                      <template v-if="getParamsByIn(endpoint, 'header').length > 0">
                        <div class="tio-section-title">Header Parameters</div>
                        <div v-for="param in getParamsByIn(endpoint, 'header')" :key="param.name" class="tio-param-row">
                          <label class="tio-label">
                            {{ param.name }}
                            <span v-if="param.required" class="tio-required">*</span>
                            <span class="tio-in-badge">header</span>
                          </label>
                          <input v-model="tryItOutValues[`${tagName}-${index}`].headerParams[param.name]" type="text"
                            class="tio-input" :placeholder="param.schema?.example ?? param.description ?? ''"
                            @click.stop />
                        </div>
                      </template>

                      <!-- Request Body -->
                      <template v-if="endpoint.requestBody">
                        <div class="tio-section-title">Request Body</div>
                        <textarea v-model="tryItOutValues[`${tagName}-${index}`].body" class="tio-body-textarea"
                          placeholder="JSON 형식으로 입력하세요" rows="8" @click.stop />
                      </template>

                      <!-- Execute / Cancel -->
                      <div class="tio-actions">
                        <button class="tio-execute-btn" :disabled="tryItOutResponse[`${tagName}-${index}`]?.loading"
                          @click.stop="executeRequest(`${tagName}-${index}`, endpoint)">
                          {{ tryItOutResponse[`${tagName}-${index}`]?.loading ? '요청 중...' : 'Execute' }}
                        </button>
                        <span v-if="swaggerBaseUrl" class="tio-base-url">{{ swaggerBaseUrl }}</span>
                        <span v-else class="tio-base-url tio-base-url-warn">⚠ servers URL 없음 — Swagger 문서에 servers 설정을
                          확인하세요</span>
                      </div>

                      <!-- 응답 패널 -->
                      <div v-if="tryItOutResponse[`${tagName}-${index}`]" class="tio-response-panel">
                        <div class="tio-response-header">
                          <span class="tio-response-title">Responses</span>
                        </div>

                        <!-- 로딩 -->
                        <div v-if="tryItOutResponse[`${tagName}-${index}`].loading" class="tio-response-loading">
                          요청 중...
                        </div>

                        <!-- 에러 -->
                        <div v-else-if="tryItOutResponse[`${tagName}-${index}`].error" class="tio-response-error">
                          {{ tryItOutResponse[`${tagName}-${index}`].error }}
                        </div>

                        <!-- 결과 -->
                        <template v-else>
                          <!-- Request URL -->
                          <div class="tio-response-section">
                            <div class="tio-response-label">Request URL</div>
                            <div class="tio-response-url">{{ tryItOutResponse[`${tagName}-${index}`].requestUrl }}</div>
                          </div>

                          <!-- Curl -->
                          <div v-if="tryItOutResponse[`${tagName}-${index}`].curlCommand" class="tio-response-section">
                            <div class="tio-response-label">Curl</div>
                            <div class="code-block-wrapper">
                              <button class="copy-btn"
                                :class="{ copied: getCopyState(`tio-curl-${tagName}-${index}`) === 'copied' }"
                                @click.stop="copyToClipboard(tryItOutResponse[`${tagName}-${index}`].curlCommand, `tio-curl-${tagName}-${index}`)">{{
                                  getCopyState(`tio-curl-${tagName}-${index}`) === 'copied' ? '✓ 복사됨' : '복사' }}</button>
                              <pre
                                class="code-block tio-curl-block">{{ tryItOutResponse[`${tagName}-${index}`].curlCommand }}</pre>
                            </div>
                          </div>

                          <!-- Request Headers -->
                          <div class="tio-response-section">
                            <div class="tio-response-label">Request Headers</div>
                            <div class="code-block-wrapper">
                              <button class="copy-btn"
                                :class="{ copied: getCopyState(`tio-req-hdr-${tagName}-${index}`) === 'copied' }"
                                @click.stop="copyToClipboard(formatJson(tryItOutResponse[`${tagName}-${index}`].requestHeaders), `tio-req-hdr-${tagName}-${index}`)">{{
                                  getCopyState(`tio-req-hdr-${tagName}-${index}`) === 'copied' ? '✓ 복사됨' : '복사'
                                }}</button>
                              <pre
                                class="code-block">{{ formatJson(tryItOutResponse[`${tagName}-${index}`].requestHeaders) }}</pre>
                            </div>
                          </div>

                          <!-- Status -->
                          <div class="tio-response-section">
                            <div class="tio-response-label">Status</div>
                            <span class="tio-status-badge"
                              :class="getStatusClass(String(tryItOutResponse[`${tagName}-${index}`].status))">
                              {{ tryItOutResponse[`${tagName}-${index}`].status }}
                              {{ tryItOutResponse[`${tagName}-${index}`].statusText }}
                            </span>
                          </div>

                          <!-- Response Headers -->
                          <div v-if="Object.keys(tryItOutResponse[`${tagName}-${index}`].headers).length > 0"
                            class="tio-response-section">
                            <div class="tio-response-label">Response Headers</div>
                            <div class="code-block-wrapper">
                              <button class="copy-btn"
                                :class="{ copied: getCopyState(`tio-hdr-${tagName}-${index}`) === 'copied' }"
                                @click.stop="copyToClipboard(formatJson(tryItOutResponse[`${tagName}-${index}`].headers), `tio-hdr-${tagName}-${index}`)">{{
                                  getCopyState(`tio-hdr-${tagName}-${index}`) === 'copied' ? '✓ 복사됨' : '복사' }}</button>
                              <pre
                                class="code-block">{{ formatJson(tryItOutResponse[`${tagName}-${index}`].headers) }}</pre>
                            </div>
                          </div>

                          <!-- Response Body -->
                          <div class="tio-response-section">
                            <div class="tio-response-label">Response Body</div>
                            <div class="code-block-wrapper">
                              <div class="code-block-actions">
                                <button v-if="hasInsertableAccessToken(tryItOutResponse[`${tagName}-${index}`].body)"
                                  class="insert-token-btn" type="button"
                                  @click.stop="insertAccessTokenFromResponse(`${tagName}-${index}`)">
                                  삽입하기
                                </button>
                                <button class="copy-btn" type="button"
                                  :class="{ copied: getCopyState(`tio-body-${tagName}-${index}`) === 'copied' }"
                                  @click.stop="copyToClipboard(tryItOutResponse[`${tagName}-${index}`].body, `tio-body-${tagName}-${index}`)">{{
                                    getCopyState(`tio-body-${tagName}-${index}`) === 'copied' ? '✓ 복사됨' : '복사' }}</button>
                              </div>
                              <pre class="code-block">{{ tryItOutResponse[`${tagName}-${index}`].body }}</pre>
                            </div>
                          </div>
                        </template>
                      </div>
                    </div>

                    <!-- Parameters -->
                    <div v-if="endpoint.parameters && endpoint.parameters.length > 0" class="detail-section">
                      <h4>Parameters</h4>
                      <div class="parameter-list">
                        <div v-for="(param, pIndex) in endpoint.parameters" :key="pIndex" class="parameter-item">
                          <span class="param-name">{{ param.name }}</span>
                          <span class="param-in">({{ param.in }})</span>
                          <span v-if="param.required" class="param-required">required</span>
                          <span v-if="param.description" class="param-desc">{{ param.description }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Request Body -->
                    <div v-if="endpoint.requestBody" class="detail-section">
                      <div class="body-header">
                        <h4>Request Body</h4>
                        <span v-if="endpoint.requestBody.required" class="body-required-badge">required</span>
                      </div>
                      <div v-for="contentType in getRequestBodyContentTypes(endpoint.requestBody)" :key="contentType"
                        class="body-content-block">
                        <div class="body-content-type">{{ contentType }}</div>
                        <div class="body-tabs">
                          <button class="body-tab-btn"
                            :class="{ active: getBodyTab(`${tagName}-${index}-${contentType}`) === 'example' }"
                            @click.stop="setBodyTab(`${tagName}-${index}-${contentType}`, 'example')">Example
                            Value</button>
                          <button class="body-tab-btn"
                            :class="{ active: getBodyTab(`${tagName}-${index}-${contentType}`) === 'schema' }"
                            @click.stop="setBodyTab(`${tagName}-${index}-${contentType}`, 'schema')">Schema</button>
                        </div>
                        <template v-if="endpoint.requestBody.content[contentType]?.schema">
                          <div v-if="getBodyTab(`${tagName}-${index}-${contentType}`) === 'example'"
                            class="code-block-wrapper">
                            <button class="copy-btn"
                              :class="{ copied: getCopyState(`req-ex-${tagName}-${index}-${contentType}`) === 'copied' }"
                              @click.stop="copyToClipboard(formatJson(buildExampleFromSchema(endpoint.requestBody.content[contentType].schema) ?? endpoint.requestBody.content[contentType].schema), `req-ex-${tagName}-${index}-${contentType}`)">{{
                                getCopyState(`req-ex-${tagName}-${index}-${contentType}`) === 'copied' ? '✓ 복사됨' : '복사'
                              }}</button>
                            <pre
                              class="code-block">{{ formatJson(buildExampleFromSchema(endpoint.requestBody.content[contentType].schema) ?? endpoint.requestBody.content[contentType].schema) }}</pre>
                          </div>
                          <template v-else>
                            <div
                              v-if="getSchemaName(endpoint.requestBody.content[contentType].schema) || endpoint.requestBody.content[contentType].schema?.description"
                              class="schema-description">
                              <span v-if="getSchemaName(endpoint.requestBody.content[contentType].schema)"
                                class="schema-description-name">{{
                                  getSchemaName(endpoint.requestBody.content[contentType].schema) }}</span><span
                                v-if="getSchemaName(endpoint.requestBody.content[contentType].schema) && endpoint.requestBody.content[contentType].schema?.description"
                                class="schema-description-sep">:</span>
                              <span v-if="endpoint.requestBody.content[contentType].schema?.description"
                                class="schema-description-text">{{
                                  endpoint.requestBody.content[contentType].schema.description.trim() }}</span>
                            </div>
                            <div class="code-block-wrapper">
                              <button class="copy-btn"
                                :class="{ copied: getCopyState(`req-sc-${tagName}-${index}-${contentType}`) === 'copied' }"
                                @click.stop="copyToClipboard(formatSchema(endpoint.requestBody.content[contentType].schema), `req-sc-${tagName}-${index}-${contentType}`)">{{
                                  getCopyState(`req-sc-${tagName}-${index}-${contentType}`) === 'copied' ? '✓ 복사됨' : '복사'
                                }}</button>
                              <pre
                                class="code-block">{{ formatSchema(endpoint.requestBody.content[contentType].schema) }}</pre>
                            </div>
                          </template>
                        </template>
                        <div v-else class="code-block-wrapper">
                          <button class="copy-btn"
                            :class="{ copied: getCopyState(`req-fb-${tagName}-${index}-${contentType}`) === 'copied' }"
                            @click.stop="copyToClipboard(formatJson(endpoint.requestBody.content[contentType]), `req-fb-${tagName}-${index}-${contentType}`)">{{
                              getCopyState(`req-fb-${tagName}-${index}-${contentType}`) === 'copied' ? '✓ 복사됨' : '복사'
                            }}</button>
                          <pre class="code-block">{{ formatJson(endpoint.requestBody.content[contentType]) }}</pre>
                        </div>
                      </div>
                      <!-- content 키가 없는 경우 폴백 -->
                      <pre v-if="getRequestBodyContentTypes(endpoint.requestBody).length === 0" class="code-block">{{
                        formatJson(endpoint.requestBody) }}</pre>
                    </div>

                    <!-- Responses -->
                    <div v-if="endpoint.responses" class="detail-section">
                      <h4>Responses</h4>
                      <div class="response-list">
                        <div v-for="(response, statusCode) in endpoint.responses" :key="statusCode"
                          class="response-item">
                          <div class="response-status" :class="getStatusClass(statusCode)">
                            {{ statusCode }}
                          </div>
                          <div class="response-content">
                            <div v-if="response.description" class="response-desc">
                              {{ response.description }}
                            </div>
                            <!-- content-type 별 탭 표시 -->
                            <template v-if="getResponseContentTypes(response).length > 0">
                              <div v-for="contentType in getResponseContentTypes(response)" :key="contentType"
                                class="body-content-block">
                                <div class="body-content-type">{{ contentType }}</div>
                                <template
                                  v-if="response.content[contentType]?.schema || response.content[contentType]?.example">
                                  <div class="body-tabs">
                                    <button class="body-tab-btn"
                                      :class="{ active: getResponseTab(`${tagName}-${index}-${statusCode}-${contentType}`) === 'example' }"
                                      @click.stop="setResponseTab(`${tagName}-${index}-${statusCode}-${contentType}`, 'example')">Example
                                      Value</button>
                                    <button v-if="response.content[contentType]?.schema" class="body-tab-btn"
                                      :class="{ active: getResponseTab(`${tagName}-${index}-${statusCode}-${contentType}`) === 'schema' }"
                                      @click.stop="setResponseTab(`${tagName}-${index}-${statusCode}-${contentType}`, 'schema')">Schema</button>
                                  </div>
                                  <div
                                    v-if="getResponseTab(`${tagName}-${index}-${statusCode}-${contentType}`) === 'example' || !response.content[contentType]?.schema"
                                    class="code-block-wrapper">
                                    <button class="copy-btn"
                                      :class="{ copied: getCopyState(`res-ex-${tagName}-${index}-${statusCode}-${contentType}`) === 'copied' }"
                                      @click.stop="copyToClipboard(formatJson(buildExampleFromResponseContent(response.content[contentType])), `res-ex-${tagName}-${index}-${statusCode}-${contentType}`)">{{
                                        getCopyState(`res-ex-${tagName}-${index}-${statusCode}-${contentType}`) ===
                                      'copied' ? '✓ 복사됨' : '복사' }}</button>
                                    <pre
                                      class="code-block">{{ formatJson(buildExampleFromResponseContent(response.content[contentType])) }}</pre>
                                  </div>
                                  <template v-else>
                                    <div
                                      v-if="getSchemaName(response.content[contentType].schema) || response.content[contentType].schema?.description"
                                      class="schema-description">
                                      <span v-if="getSchemaName(response.content[contentType].schema)"
                                        class="schema-description-name">{{
                                          getSchemaName(response.content[contentType].schema) }}</span><span
                                        v-if="getSchemaName(response.content[contentType].schema) && response.content[contentType].schema?.description"
                                        class="schema-description-sep">:</span>
                                      <span v-if="response.content[contentType].schema?.description"
                                        class="schema-description-text">{{
                                          response.content[contentType].schema.description.trim() }}</span>
                                    </div>
                                    <div class="code-block-wrapper">
                                      <button class="copy-btn"
                                        :class="{ copied: getCopyState(`res-sc-${tagName}-${index}-${statusCode}-${contentType}`) === 'copied' }"
                                        @click.stop="copyToClipboard(formatSchema(response.content[contentType].schema), `res-sc-${tagName}-${index}-${statusCode}-${contentType}`)">{{
                                          getCopyState(`res-sc-${tagName}-${index}-${statusCode}-${contentType}`) ===
                                        'copied' ? '✓ 복사됨' : '복사' }}</button>
                                      <pre
                                        class="code-block">{{ formatSchema(response.content[contentType].schema) }}</pre>
                                    </div>
                                  </template>
                                </template>
                                <div v-else class="code-block-wrapper">
                                  <button class="copy-btn"
                                    :class="{ copied: getCopyState(`res-fb-${tagName}-${index}-${statusCode}-${contentType}`) === 'copied' }"
                                    @click.stop="copyToClipboard(formatJson(buildExampleFromResponseContent(response.content[contentType])), `res-fb-${tagName}-${index}-${statusCode}-${contentType}`)">{{
                                      getCopyState(`res-fb-${tagName}-${index}-${statusCode}-${contentType}`) === 'copied'
                                    ? '✓ 복사됨' :
                                    '복사' }}</button>
                                  <pre class="code-block">{{
                                    formatJson(buildExampleFromResponseContent(response.content[contentType])) }}</pre>
                                </div>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="diffs-section">
          <h2>변경 내역</h2>
          <div v-if="diffs.length === 0" class="empty-state">
            아직 변경 내역이 없습니다.
          </div>
          <div v-else class="diffs-list">
            <DiffCard v-for="diff in diffs" :key="diff.comparedAt" :diff="diff" @view="handleViewDiff" />
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <Transition name="toast-fade">
        <div
          v-if="toastMessage && toastPosition"
          class="copy-toast"
          role="status"
          :style="{ top: `${toastPosition.top}px`, left: `${toastPosition.left}px` }"
        >
          {{ toastMessage }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Teleport } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/stores/project-store'
import { useAuthStore } from '@/stores/auth-store'
import DiffCard from '@/components/DiffCard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ProjectFormModal from '@/components/ProjectFormModal.vue'
import type { DiffResult } from '@/types/diff'
import type { Project } from '@/types/project'
import { buildCurlCommand } from '@/utils/build-curl-command'
import {
  extractAccessTokenFromResponseBody,
  hasInsertableAccessToken
} from '@/utils/extract-access-token'

const route = useRoute()
const router = useRouter()
const store = useProjectStore()
const showDeleteDialog = ref(false)
const showEditModal = ref(false)
const showApiList = ref(true) // API 목록 토글 상태
const expandedApiKeys = ref<Set<string>>(new Set()) // 확장된 API 키 (태그-인덱스)
const expandedTags = ref<Set<string>>(new Set()) // 확장된 태그들

const projectId = route.params.id as string
const project = computed(() => store.getProject(projectId))
const isLoading = computed(() => store.isProjectLoading(projectId))
const snapshots = computed(() => store.getSnapshotsByProject(projectId))
const diffs = computed(() => store.getDiffsByProject(projectId))

const latestVersion = computed(() => {
  const latest = snapshots.value[0]
  return latest?.version
})

const lastCheckedText = computed(() => {
  if (!project.value?.lastCheckedAt) return '체크 기록 없음'
  try {
    return formatDistanceToNow(new Date(project.value.lastCheckedAt), {
      addSuffix: true,
      locale: ko
    })
  } catch {
    return project.value.lastCheckedAt
  }
})

// API 엔드포인트 목록 생성
interface ApiEndpoint {
  method: string
  path: string
  summary?: string
  requestBody?: any
  responses?: Record<string, any>
  parameters?: any[]
  tags?: string[]
}

// $ref를 resolve하는 헬퍼 함수
function resolveRef(ref: string, swaggerData: any): any {
  // $ref 형식: "#/components/schemas/SchemaName"
  if (!ref || !ref.startsWith('#/')) return null

  const parts = ref.substring(2).split('/')
  let result = swaggerData

  for (const part of parts) {
    if (!result || typeof result !== 'object') return null
    result = result[part]
  }

  return result
}

// 재귀적으로 모든 $ref를 resolve하는 함수
function resolveAllRefs(obj: any, swaggerData: any, visited = new Set<string>()): any {
  if (!obj || typeof obj !== 'object') return obj

  // 배열 처리
  if (Array.isArray(obj)) {
    return obj.map(item => resolveAllRefs(item, swaggerData, visited))
  }

  // $ref가 있는 경우
  if (obj.$ref) {
    const ref = obj.$ref

    // 순환 참조 방지
    if (visited.has(ref)) {
      return { $ref: ref, _note: 'Circular reference detected' }
    }

    visited.add(ref)

    const resolved = resolveRef(ref, swaggerData)
    if (resolved) {
      // 해결된 스키마도 재귀적으로 처리
      const resolvedSchema = resolveAllRefs(resolved, swaggerData, new Set(visited))
      // $ref 경로 마지막 세그먼트를 스키마 이름으로 보존 (e.g. "#/components/schemas/MySchema" → "MySchema")
      const schemaName = ref.split('/').pop() || ''
      if (schemaName && !resolvedSchema._schemaName) {
        return { ...resolvedSchema, _schemaName: schemaName }
      }
      return resolvedSchema
    }

    return obj
  }

  // 객체의 모든 속성을 재귀적으로 처리
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveAllRefs(value, swaggerData, visited)
  }

  return result
}

// content의 $ref를 실제 스키마로 대체하는 공통 함수
function resolveContentSchema(content: any, swaggerData: any): any {
  if (!content || typeof content !== 'object') return content

  return resolveAllRefs(content, swaggerData)
}

// response의 $ref를 실제 스키마로 대체하는 함수
function resolveResponseSchema(responses: any, swaggerData: any): any {
  if (!responses || typeof responses !== 'object') return responses

  const resolvedResponses: Record<string, any> = {}

  for (const [statusCode, response] of Object.entries(responses)) {
    const resolvedResponse = { ...response as any }

    // content가 있는 경우
    if (resolvedResponse.content && typeof resolvedResponse.content === 'object') {
      resolvedResponse.content = resolveContentSchema(resolvedResponse.content, swaggerData)
    }

    resolvedResponses[statusCode] = resolvedResponse
  }

  return resolvedResponses
}

// requestBody의 $ref를 실제 스키마로 대체하는 함수
function resolveRequestBodySchema(requestBody: any, swaggerData: any): any {
  if (!requestBody || typeof requestBody !== 'object') return requestBody

  const resolvedRequestBody = { ...requestBody }

  // content가 있는 경우
  if (resolvedRequestBody.content && typeof resolvedRequestBody.content === 'object') {
    resolvedRequestBody.content = resolveContentSchema(resolvedRequestBody.content, swaggerData)
  }

  return resolvedRequestBody
}

const apiEndpoints = computed<ApiEndpoint[]>(() => {
  const latestSnapshot = snapshots.value[0]
  if (!latestSnapshot) return []

  try {
    const swaggerData = JSON.parse(latestSnapshot.data)
    const endpoints: ApiEndpoint[] = []

    if (swaggerData.paths) {
      for (const [path, methods] of Object.entries(swaggerData.paths)) {
        for (const [method, details] of Object.entries(methods as Record<string, any>)) {
          // HTTP 메서드만 추출 (get, post, put, delete, patch 등)
          if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
            // responses와 requestBody의 $ref를 resolve
            const resolvedResponses = resolveResponseSchema(details?.responses, swaggerData)
            const resolvedRequestBody = resolveRequestBodySchema(details?.requestBody, swaggerData)

            endpoints.push({
              method,
              path,
              summary: details?.summary || details?.description || '',
              requestBody: resolvedRequestBody,
              responses: resolvedResponses,
              parameters: details?.parameters,
              tags: details?.tags || []
            })
          }
        }
      }
    }

    // 메서드 순서: GET, POST, PUT, PATCH, DELETE
    const methodOrder = { get: 1, post: 2, put: 3, patch: 4, delete: 5, options: 6, head: 7 }
    return endpoints.sort((a, b) => {
      // 먼저 경로로 정렬
      if (a.path !== b.path) {
        return a.path.localeCompare(b.path)
      }
      // 같은 경로면 메서드 순서로 정렬
      const orderA = methodOrder[a.method.toLowerCase() as keyof typeof methodOrder] || 99
      const orderB = methodOrder[b.method.toLowerCase() as keyof typeof methodOrder] || 99
      return orderA - orderB
    })
  } catch (error) {
    console.error('Failed to parse swagger data:', error)
    return []
  }
})

// 태그별로 그룹화된 API 엔드포인트
const groupedApiEndpoints = computed(() => {
  const groups: Record<string, ApiEndpoint[]> = {}

  for (const endpoint of apiEndpoints.value) {
    // 태그가 없거나 빈 배열이면 'Untagged'로 분류
    const tags = endpoint.tags && endpoint.tags.length > 0 ? endpoint.tags : ['Untagged']

    // 하나의 엔드포인트가 여러 태그를 가질 수 있음
    for (const tag of tags) {
      if (!groups[tag]) {
        groups[tag] = []
      }
      groups[tag].push(endpoint)
    }
  }

  // 태그 이름순으로 정렬 (Untagged는 마지막에)
  const sortedGroups: Record<string, ApiEndpoint[]> = {}
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'Untagged') return 1
    if (b === 'Untagged') return -1
    return a.localeCompare(b)
  })

  for (const key of sortedKeys) {
    sortedGroups[key] = groups[key]
  }

  return sortedGroups
})

// 첫 번째 태그를 자동으로 확장 (한 번만 실행)
watch(groupedApiEndpoints, (groups) => {
  const keys = Object.keys(groups)
  if (keys.length > 0 && expandedTags.value.size === 0) {
    expandedTags.value.add(keys[0])
  }
}, { immediate: true })

function handleCheck() {
  if (projectId) {
    store.collectSwagger(projectId)
  }
}

function toggleApiList() {
  showApiList.value = !showApiList.value
}

function toggleTagGroup(tagName: string) {
  if (expandedTags.value.has(tagName)) {
    expandedTags.value.delete(tagName)
  } else {
    expandedTags.value.add(tagName)
  }
  // 반응성을 위해 새로운 Set 생성
  expandedTags.value = new Set(expandedTags.value)
}

function toggleApiDetail(key: string) {
  if (expandedApiKeys.value.has(key)) {
    expandedApiKeys.value.delete(key)
  } else {
    expandedApiKeys.value.add(key)
  }
  expandedApiKeys.value = new Set(expandedApiKeys.value)
}

function formatJson(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2).replace(/\\n/g, '\n')
  } catch {
    return String(obj)
  }
}

// Request Body 탭 상태 (엔드포인트 key → 'example' | 'schema')
const bodyTabMap = ref<Record<string, 'example' | 'schema'>>({})

function getBodyTab(key: string): 'example' | 'schema' {
  return bodyTabMap.value[key] ?? 'example'
}

function setBodyTab(key: string, tab: 'example' | 'schema') {
  bodyTabMap.value[key] = tab
}

// Response 탭 상태 (엔드포인트 key + statusCode + contentType → 'example' | 'schema')
const responseTabMap = ref<Record<string, 'example' | 'schema'>>({})

function getResponseTab(key: string): 'example' | 'schema' {
  return responseTabMap.value[key] ?? 'example'
}

function setResponseTab(key: string, tab: 'example' | 'schema') {
  responseTabMap.value[key] = tab
}

// 응답 content 에서 content-type 목록 추출
function getResponseContentTypes(response: any): string[] {
  if (!response?.content) return []
  return Object.keys(response.content)
}

// 응답 content-type 블록의 Example Value 조립
// 우선순위: content.example → content.examples 첫번째 → schema.example → buildExampleFromSchema
function buildExampleFromResponseContent(contentTypeBlock: any): any {
  if (!contentTypeBlock) return null

  // content-type 레벨의 example 필드
  if (contentTypeBlock.example !== undefined) return contentTypeBlock.example

  // content-type 레벨의 examples 맵 (첫 번째 항목의 value 사용)
  if (contentTypeBlock.examples && typeof contentTypeBlock.examples === 'object') {
    const firstKey = Object.keys(contentTypeBlock.examples)[0]
    if (firstKey) {
      const firstExample = contentTypeBlock.examples[firstKey]
      if (firstExample?.value !== undefined) return firstExample.value
    }
  }

  // schema 레벨로 폴백
  return buildExampleFromSchema(contentTypeBlock.schema) ?? contentTypeBlock.schema ?? null
}

// schema에서 이름 추출 (_schemaName 우선, 없으면 title)
function getSchemaName(schema: any): string | null {
  if (!schema) return null
  return schema._schemaName || schema.title || null
}

// formatJson 출력 시 내부 메타 필드(_schemaName 등) 제외
function formatSchema(schema: any): string {
  if (!schema) return ''
  try {
    // properties가 있으면 properties만, 없으면 메타 필드 제거 후 전체 출력
    const target = schema.properties
      ? JSON.parse(JSON.stringify(schema.properties))
      : (() => {
        const clean = JSON.parse(JSON.stringify(schema))
        delete clean._schemaName
        return clean
      })()
    return JSON.stringify(target, null, 2).replace(/\\n/g, '\n')
  } catch {
    return String(schema)
  }
}

// requestBody 에서 content-type 목록 추출 (e.g. ['application/json'])
function getRequestBodyContentTypes(requestBody: any): string[] {
  if (!requestBody?.content) return []
  const types = Object.keys(requestBody.content)

  // application/json 계열 우선 정렬
  const preferred = ['application/json', 'application/json;charset=UTF-8']
  types.sort((a, b) => {
    const aScore = preferred.findIndex(p => a.toLowerCase().startsWith(p.toLowerCase()))
    const bScore = preferred.findIndex(p => b.toLowerCase().startsWith(p.toLowerCase()))
    const aRank = aScore === -1 ? 99 : aScore
    const bRank = bScore === -1 ? 99 : bScore
    return aRank - bRank
  })

  // 동일한 schema를 가진 와일드카드(*/*) 등 중복 content-type 제거
  // 첫 번째 항목(application/json 등)과 schema가 같으면 제거
  if (types.length > 1) {
    const firstSchema = JSON.stringify(requestBody.content[types[0]]?.schema)
    return types.filter((type, idx) => {
      if (idx === 0) return true
      return JSON.stringify(requestBody.content[type]?.schema) !== firstSchema
    })
  }

  return types
}

// schema에서 Example Value 객체 조립
function buildExampleFromSchema(schema: any): any {
  if (!schema) return null

  // 최상위 example 필드가 있으면 그대로 사용
  if (schema.example !== undefined) return schema.example

  // properties를 순회해 각 필드의 example 조립
  if (schema.type === 'object' && schema.properties) {
    const result: Record<string, any> = {}
    for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
      if (prop.example !== undefined) {
        result[key] = prop.example
      } else if (prop.type === 'string') {
        result[key] = prop.description ? `(${prop.description})` : 'string'
      } else if (prop.type === 'integer' || prop.type === 'number') {
        result[key] = 0
      } else if (prop.type === 'boolean') {
        result[key] = false
      } else if (prop.type === 'array') {
        result[key] = []
      } else if (prop.type === 'object') {
        result[key] = {}
      } else {
        result[key] = null
      }
    }
    return result
  }

  if (schema.type === 'array') {
    if (schema.items) {
      const item = buildExampleFromSchema(schema.items)
      return item !== null ? [item] : []
    }
    return []
  }

  return null
}

// 클립보드 복사 상태 (key → 'idle' | 'copied')
const copyStateMap = ref<Record<string, 'idle' | 'copied'>>({})
interface ToastPosition {
  top: number
  left: number
}

const toastMessage = ref<string | null>(null)
const toastPosition = ref<ToastPosition | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, anchorEl: HTMLElement) {
  const rect = anchorEl.getBoundingClientRect()
  toastPosition.value = {
    top: rect.top - 8,
    left: rect.left + rect.width / 2
  }

  if (toastTimer) clearTimeout(toastTimer)
  toastMessage.value = message
  toastTimer = setTimeout(() => {
    toastMessage.value = null
    toastPosition.value = null
    toastTimer = null
  }, 2000)
}

function getApiAddressText(endpoint: ApiEndpoint): string {
  const base = swaggerBaseUrl.value
  if (base) return `${base}${endpoint.path}`
  return endpoint.path
}

async function copyApiAddress(key: string, endpoint: ApiEndpoint, event: MouseEvent) {
  const anchorEl = event.currentTarget
  if (!(anchorEl instanceof HTMLElement)) return

  await copyToClipboard(getApiAddressText(endpoint), `api-path-${key}`)
  showToast('Copied', anchorEl)
}

async function copyToClipboard(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copyStateMap.value[key] = 'copied'
    setTimeout(() => { copyStateMap.value[key] = 'idle' }, 2000)
  } catch {
    // clipboard API 미지원 폴백
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copyStateMap.value[key] = 'copied'
    setTimeout(() => { copyStateMap.value[key] = 'idle' }, 2000)
  }
}

function getCopyState(key: string): 'idle' | 'copied' {
  return copyStateMap.value[key] ?? 'idle'
}

function getStatusClass(statusCode: string): string {
  const code = parseInt(statusCode)
  if (code >= 200 && code < 300) return 'status-success'
  if (code >= 300 && code < 400) return 'status-redirect'
  if (code >= 400 && code < 500) return 'status-client-error'
  if (code >= 500) return 'status-server-error'
  return ''
}

async function handleUpdate(id: string, updates: Partial<Project>) {
  try {
    await store.updateProject(id, updates)
    showEditModal.value = false
    alert('✅ 프로젝트가 성공적으로 수정되었습니다.')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    alert(`❌ 프로젝트 수정 실패\n\n${errorMessage}`)
  }
}

function handleViewDiff(diff: DiffResult) {
  router.push(`/diff/${projectId}/${diff.currentSnapshotId}`)
}

function handleDeleteConfirm() {
  if (projectId) {
    store.deleteProject(projectId)
    router.push('/')
  }
}

function goHome() {
  router.push('/')
}

// ─── Authorize ─────────────────────────────────────────────────────────────

const showAuthorizePanel = ref(false)
const authConfig = ref({
  bearerToken: '',
  apiKey: '',
  apiKeyHeader: 'X-API-Key'
})

// ─── Try it out ────────────────────────────────────────────────────────────

interface TryItOutValues {
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  headerParams: Record<string, string>
  body: string
}

interface TryItOutResult {
  loading: boolean
  requestUrl: string
  requestHeaders: Record<string, string>
  curlCommand: string
  status: number | null
  statusText: string
  headers: Record<string, string>
  body: string
  error: string | null
}

const tryItOutMap = ref<Record<string, boolean>>({})
const tryItOutValues = ref<Record<string, TryItOutValues>>({})
const tryItOutResponse = ref<Record<string, TryItOutResult>>({})

// Swagger servers[0].url 또는 project.swaggerUrl 에서 base URL 추출
const swaggerBaseUrl = computed(() => {
  const snap = snapshots.value[0]
  if (!snap) return ''
  try {
    const data = JSON.parse(snap.data)
    if (data.servers?.[0]?.url) return data.servers[0].url.replace(/\/$/, '')
  } catch { /* ignore */ }
  // project.swaggerUrl에서 swagger 경로 제거하여 base 추출
  const swaggerUrl = project.value?.swaggerUrl || ''
  try {
    const u = new URL(swaggerUrl)
    return `${u.protocol}//${u.host}`
  } catch {
    return ''
  }
})

function initTryItOut(key: string, endpoint: ApiEndpoint) {
  const pathParams: Record<string, string> = {}
  const queryParams: Record<string, string> = {}
  const headerParams: Record<string, string> = {}

  for (const param of (endpoint.parameters || [])) {
    const p = param as any
    const defaultVal = p.schema?.default ?? p.schema?.example ?? ''
    if (p.in === 'path') pathParams[p.name] = String(defaultVal)
    else if (p.in === 'query') queryParams[p.name] = String(defaultVal)
    else if (p.in === 'header') headerParams[p.name] = String(defaultVal)
  }

  // request body: application/json schema에서 example 조립
  let body = ''
  if (endpoint.requestBody) {
    const rb = endpoint.requestBody as any
    const contentTypes = getRequestBodyContentTypes(rb)
    const ct = contentTypes[0]
    if (ct) {
      const schema = rb.content?.[ct]?.schema
      const example = buildExampleFromSchema(schema)
      body = example != null ? JSON.stringify(example, null, 2) : ''
    }
  }

  tryItOutValues.value[key] = { pathParams, queryParams, headerParams, body }
}

function toggleTryItOut(key: string, endpoint: ApiEndpoint) {
  const isActive = tryItOutMap.value[key]
  tryItOutMap.value[key] = !isActive
  if (!isActive) {
    initTryItOut(key, endpoint)
    // 결과 초기화
    delete tryItOutResponse.value[key]
  }
}

function buildTargetHeaders(values: TryItOutValues): Record<string, string> {
  const targetHeaders: Record<string, string> = {}

  if (authConfig.value.bearerToken) {
    targetHeaders.Authorization = `Bearer ${authConfig.value.bearerToken}`
  }
  if (authConfig.value.apiKey && authConfig.value.apiKeyHeader) {
    targetHeaders[authConfig.value.apiKeyHeader] = authConfig.value.apiKey
  }
  for (const [key, value] of Object.entries(values.headerParams)) {
    if (value !== '') targetHeaders[key] = value
  }

  return targetHeaders
}

function appendContentTypeHeader(
  targetHeaders: Record<string, string>,
  method: string,
  values: TryItOutValues
): { bodyData: unknown; headers: Record<string, string> } {
  const headers = { ...targetHeaders }
  let bodyData: unknown = undefined

  if (!['post', 'put', 'patch'].includes(method) || !values.body.trim()) {
    return { bodyData, headers }
  }

  try {
    bodyData = JSON.parse(values.body)
    headers['Content-Type'] = 'application/json'
  } catch {
    headers['Content-Type'] = 'text/plain'
    bodyData = values.body
  }

  return { bodyData, headers }
}

async function executeRequest(key: string, endpoint: ApiEndpoint) {
  const values = tryItOutValues.value[key]
  if (!values) return

  tryItOutResponse.value[key] = {
    loading: true,
    requestUrl: '',
    requestHeaders: {},
    curlCommand: '',
    status: null,
    statusText: '',
    headers: {},
    body: '',
    error: null
  }

  try {
    const base = swaggerBaseUrl.value
    if (!base) {
      tryItOutResponse.value[key] = {
        ...tryItOutResponse.value[key],
        loading: false,
        error: 'Swagger 문서에 servers URL이 없어 요청을 보낼 수 없습니다'
      }
      return
    }

    let resolvedPath = endpoint.path
    for (const [pathKey, pathValue] of Object.entries(values.pathParams)) {
      resolvedPath = resolvedPath.replace(`{${pathKey}}`, encodeURIComponent(pathValue))
    }

    const url = new URL(`${base}${resolvedPath}`)
    for (const [queryKey, queryValue] of Object.entries(values.queryParams)) {
      if (queryValue !== '') url.searchParams.set(queryKey, queryValue)
    }

    const requestUrl = url.toString()
    const method = endpoint.method.toLowerCase()
    const baseHeaders = buildTargetHeaders(values)
    const { bodyData, headers: targetHeaders } = appendContentTypeHeader(baseHeaders, method, values)
    const curlCommand = buildCurlCommand(method, requestUrl, targetHeaders, bodyData)

    tryItOutResponse.value[key].requestUrl = requestUrl
    tryItOutResponse.value[key].requestHeaders = targetHeaders
    tryItOutResponse.value[key].curlCommand = curlCommand

    const { data: proxyData, error: proxyError } = await supabase.functions.invoke('proxy', {
      body: { method, url: requestUrl, headers: targetHeaders, body: bodyData }
    })

    if (proxyError) throw proxyError

    tryItOutResponse.value[key] = {
      loading: false,
      requestUrl,
      requestHeaders: targetHeaders,
      curlCommand,
      status: proxyData.status,
      statusText: proxyData.statusText,
      headers: proxyData.headers || {},
      body: typeof proxyData.body === 'object'
        ? JSON.stringify(proxyData.body, null, 2)
        : String(proxyData.body ?? ''),
      error: null
    }
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message || '요청 중 오류가 발생했습니다'
    tryItOutResponse.value[key] = { ...tryItOutResponse.value[key], loading: false, error: msg }
  }
}

function getParamsByIn(endpoint: ApiEndpoint, inType: string): any[] {
  return (endpoint.parameters || []).filter((p: any) => p.in === inType)
}

function insertAccessTokenFromResponse(key: string) {
  const response = tryItOutResponse.value[key]
  if (!response?.body) return

  const token = extractAccessTokenFromResponseBody(response.body)
  if (!token) return

  authConfig.value.bearerToken = token
  showAuthorizePanel.value = true
}

onMounted(async () => {
  // 프로젝트가 없으면 백엔드에서 로드 시도
  const authStore = useAuthStore()
  if (!project.value) {
    if (authStore.isAuthenticated) {
      await store.loadProjectsFromBackend()
      if (!store.getProject(projectId)) {
        router.push('/')
        return
      }
    } else {
      router.push('/')
      return
    }
  }

  if (authStore.isAuthenticated) {
    await store.loadSnapshotsFromBackend(projectId)
    await store.loadDiffsFromBackend(projectId)
  }
})
</script>

<style lang="scss" scoped>
.project-detail {
  min-height: 100vh;
  background: var(--bg-secondary);
  padding: $spacing-xl;
}

.page-header {
  max-width: 1200px;
  margin: 0 auto $spacing-xl;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $spacing-lg;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: $spacing-md;
  flex: 1;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: $spacing-xs;
  }

  .subtitle {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
}

.btn-back {
  background: var(--bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-size: 0.875rem;
  margin-top: $spacing-xs;

  &:hover {
    background: var(--color-border-light);
  }
}

.header-actions {
  display: flex;
  gap: $spacing-md;
  align-items: center;
}


.content {
  max-width: 1200px;
  margin: 0 auto;
}

.info-section,
.api-list-section,
.diffs-section {
  @include card;
  margin-bottom: $spacing-xl;

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: $spacing-lg;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: $spacing-lg;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  .label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .value {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
}

.empty-state {
  text-align: center;
  padding: $spacing-2xl;
  color: var(--color-text-secondary);
}

.diffs-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

// API 목록 섹션
.api-list-section {
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-lg;
    cursor: pointer;
    user-select: none;
    padding: $spacing-sm;
    /* margin: -$spacing-sm; */
    border-radius: $radius-md;
    transition: background 0.2s;

    &:hover {
      background: var(--bg-tertiary);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: $spacing-md;
      flex: 1;

      h2 {
        margin-bottom: 0;
      }

      .api-count {
        font-size: 0.875rem;
        color: var(--color-text-secondary);
        background: var(--bg-tertiary);
        padding: $spacing-xs $spacing-md;
        border-radius: $radius-full;
      }
    }

    .toggle-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: $spacing-xs;
      transition: color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;

      .chevron-icon {
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        transform: rotate(0deg);
      }

      &:hover {
        color: var(--color-text-primary);
      }

      &.expanded {
        color: var(--color-primary);

        .chevron-icon {
          transform: rotate(90deg);
        }
      }
    }
  }
}

.api-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  // max-height: 800px;
  // overflow-y: auto;
  margin-top: 10px;
  padding: $spacing-xs;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--bg-tertiary);
    border-radius: $radius-sm;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: $radius-sm;

    &:hover {
      background: var(--color-text-secondary);
    }
  }
}

// 태그 그룹 스타일
.tag-group {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-light);
  border-radius: $radius-md;
  background: var(--bg-primary);
}

.tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm $spacing-lg;
  background: var(--bg-secondary);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;

  &:hover {
    background: var(--bg-tertiary);
  }

  .tag-info {
    display: flex;
    align-items: center;
    gap: $spacing-md;

    h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0;
    }

    .tag-count {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      background: var(--bg-primary);
      padding: $spacing-xs $spacing-md;
      border-radius: $radius-full;
    }
  }

  .tag-expand-icon {
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    transition: color 0.2s;

    .chevron-icon {
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      transform: rotate(0deg);
    }

    &.expanded .chevron-icon {
      transform: rotate(90deg);
    }
  }

}

.tag-apis {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-md;
  background: var(--bg-primary);
}

.api-item {
  display: flex;
  flex-direction: column;
  background: rgba(97, 175, 254, .1); /// var(--bg-tertiary);
  border-radius: $radius-md;
  transition: all 0.2s;
  cursor: pointer;
  // overflow: hidden;
  border: 1px solid #dedede;

  &:hover {
    background: var(--bg-secondary);
  }

  &.expanded {
    background: var(--bg-secondary);
    box-shadow: $shadow-md;
  }

  &.api-item-post {
    background: #d8ffe1;

    &:hover,
    &.expanded {
      background: #c2fee2;
    }
  }

  &.api-item-delete {
    background: #fee2e2;

    &:hover,
    &.expanded {
      background: #fcd3d3;
    }
  }

  &.api-item-put {
    background: #fef3c7;

    &:hover,
    &.expanded {
      background: #fdf6d9;
    }
  }

  &.api-item-patch {
    background: #e0e7ff;

    &:hover,
    &.expanded {
      background: #d6dfff;
    }
  }
}

.api-main {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xs $spacing-md;
}

.api-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  flex-shrink: 0;
}

.api-copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;

  .clipboard-icon {
    width: 15px;
    height: 15px;
  }

  &:hover {
    color: var(--color-primary);
    background: rgba(0, 0, 0, 0.06);
  }

  &.copied {
    color: #166534;
    background: #dcfce7;
  }
}

.api-expand-icon {
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  transition: color 0.2s;

  .chevron-icon {
    width: 16px;
    height: 16px;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform: rotate(0deg);
  }

  &.expanded .chevron-icon {
    transform: rotate(90deg);
    color: var(--color-primary);
  }
}

.api-method {
  flex-shrink: 0;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  min-width: 60px;
  text-align: center;

  &.method-get {
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #65a05d;
  }

  &.method-post {
    background: #7bf6b6;
    color: #065f46;
    border: 1px solid #65a05d;
  }

  &.method-put {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #49220a;
  }

  &.method-patch {
    background: #e0e7ff;
    color: #3730a3;
    border: 1px solid #5181a5;
  }

  &.method-delete {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #540f0f;
  }

  &.method-options,
  &.method-head {
    background: #f3f4f6;
    color: #4b5563;
  }
}

.api-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  // gap: $spacing-xs;
}

.api-path {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-primary);
  word-break: break-all;
}

.api-summary {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  // overflow: hidden;
  // text-overflow: ellipsis;
  // white-space: nowrap;
}

// API 상세 정보
.api-details {
  padding: $spacing-md;
  border-top: 1px solid var(--color-border);
  background: var(--bg-primary);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }

  to {
    opacity: 1;
    max-height: 500px;
  }
}

.detail-section {
  margin-bottom: $spacing-md;

  &:last-child {
    margin-bottom: 0;
  }

  h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: $spacing-sm;
    padding-bottom: $spacing-xs;
    border-bottom: 1px solid var(--color-border);
  }
}

.body-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
  padding-bottom: $spacing-xs;
  border-bottom: 1px solid var(--color-border);

  h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
    border-bottom: none;
    padding-bottom: 0;
  }
}

.body-required-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
  background: $color-danger;
  padding: 1px $spacing-xs;
  border-radius: $radius-sm;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.body-content-block {
  margin-bottom: $spacing-sm;

  &:last-child {
    margin-bottom: 0;
  }
}

.chevron-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.schema-description {
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin-bottom: $spacing-sm;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 10px;

  .schema-description-name {
    font-weight: 700;
    color: var(--color-primary);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .schema-description-sep {
    font-weight: 700;
    color: var(--color-text-primary);
    margin-right: $spacing-xs;
  }

  .schema-description-text {
    color: var(--color-text-secondary);
  }
}

.body-content-type {
  display: inline-block;
  font-size: 0.7rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: var(--color-text-secondary);
  background: var(--bg-tertiary);
  border: 1px solid var(--color-border);
  padding: 2px $spacing-sm;
  border-radius: $radius-sm;
  margin-bottom: $spacing-xs;
}

.body-tabs {
  display: flex;
  gap: 2px;
  // margin-bottom: $spacing-xs;
  margin-top: 10px;
  padding: 3px 0;
  border-bottom: 1px solid var(--color-border);
}

.body-tab-btn {
  padding: $spacing-xs $spacing-md;
  font-size: 0.75rem;
  font-weight: 500;
  background: none;
  border: 1px solid var(--color-border);
  // border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: -1px;

  &:hover {
    color: var(--color-text-primary);
  }

  &.active {
    color: var(--color-primary);
    // border-bottom-color: var(--color-primary);
    font-weight: 600;
  }
}

.parameter-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.parameter-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xs $spacing-sm;
  background: var(--bg-tertiary);
  border-radius: $radius-sm;
  font-size: 0.75rem;

  .param-name {
    font-weight: 600;
    color: var(--color-text-primary);
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .param-in {
    color: var(--color-text-secondary);
    font-size: 0.7rem;
  }

  .param-required {
    color: $color-danger;
    font-weight: 600;
    font-size: 0.7rem;
  }

  .param-desc {
    color: var(--color-text-secondary);
    margin-left: auto;
  }
}

.code-block-wrapper {
  position: relative;

  &:hover .copy-btn,
  &:hover .insert-token-btn {
    opacity: 1;
  }
}

.code-block-actions {
  position: absolute;
  top: $spacing-xs;
  right: $spacing-xs;
  z-index: 1;
  display: flex;
  gap: $spacing-xs;
}

.insert-token-btn {
  padding: 6px 10px;
  font-size: 0.875rem;
  font-weight: 500;
  background: #1e3a5f;
  color: #93c5fd;
  border: 1px solid #2563eb;
  border-radius: $radius-sm;
  cursor: pointer;
  opacity: 1;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: #1d4ed8;
    color: #fff;
  }
}

.copy-btn {
  position: absolute;
  right: 0;
  top: 0;
  z-index: 1;
  padding: 6px 10px;
  font-size: 0.875rem;
  font-weight: 500;
  background: #3a3a3a;
  color: #ccc;
  border: 1px solid #555;
  border-radius: $radius-sm;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;

  &:hover {
    background: #4a4a4a;
    color: #fff;
  }

  &.copied {
    background: #1a4a2a;
    color: #6ee7a0;
    border-color: #2d6b42;
    opacity: 1;
  }
}

.code-block {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: $spacing-sm;
  border-radius: $radius-sm;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.7rem;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
  margin: 0;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #2d2d2d;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 3px;

    &:hover {
      background: #777;
    }
  }
}

.response-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.response-item {
  display: flex;
  gap: $spacing-sm;
  align-items: flex-start;
}

.response-status {
  flex-shrink: 0;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-sm;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 50px;
  text-align: center;

  &.status-success {
    background: #d1fae5;
    color: #065f46;
  }

  &.status-redirect {
    background: #e0e7ff;
    color: #3730a3;
  }

  &.status-client-error {
    background: #fef3c7;
    color: #92400e;
  }

  &.status-server-error {
    background: #fee2e2;
    color: #991b1b;
  }
}

.response-content {
  flex: 1;
  min-width: 0;
}

.response-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: $spacing-xs;
}

// ─── Authorize ───────────────────────────────────────────────────────────────

.section-header-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-right: $spacing-sm;
}

.authorize-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px $spacing-sm;
  font-size: 0.75rem;
  font-weight: 600;
  background: transparent;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary);
  border-radius: $radius-sm;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover,
  &.active {
    background: var(--color-primary);
    color: #fff;
  }
}

.authorize-panel {
  background: var(--bg-primary);
  border: 1px solid var(--color-border);
  /* border-top: none; */
  border-radius: $radius-md;
  padding: $spacing-md;
  margin-bottom: $spacing-sm;
}

.authorize-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-md;

  h4 {
    font-size: 0.9rem;
    font-weight: 700;
    margin: 0;
  }
}

.authorize-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  padding: 2px 6px;

  &:hover {
    color: var(--color-text-primary);
  }
}

.authorize-fields {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.authorize-field {
  label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: 4px;
  }
}

.authorize-input-row {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.authorize-input {
  flex: 1;
  padding: 6px $spacing-sm;
  font-size: 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: $radius-sm;
  background: var(--bg-secondary);
  color: var(--color-text-primary);
  outline: none;

  &:focus {
    border-color: var(--color-primary);
  }

  &.authorize-input-sm {
    max-width: 160px;
    flex: 0 0 160px;
  }
}

.authorize-clear-btn {
  padding: 5px $spacing-sm;
  font-size: 0.7rem;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: $radius-sm;
  cursor: pointer;
  color: var(--color-text-secondary);
  white-space: nowrap;

  &:hover {
    border-color: #e53e3e;
    color: #e53e3e;
  }
}

.authorize-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $spacing-md;
  padding-top: $spacing-sm;
  border-top: 1px solid var(--color-border);
}

.authorize-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);

  &.active {
    background: #38a169;
  }
}

.btn-sm {
  padding: 4px $spacing-sm;
  font-size: 0.75rem;
}

// ─── Try it out ──────────────────────────────────────────────────────────────

.try-it-out-header {
  display: flex;
  justify-content: flex-end;
  padding: $spacing-xs 0 $spacing-sm;
}

.try-it-out-btn {
  padding: 4px $spacing-md;
  font-size: 0.75rem;
  font-weight: 600;
  background: transparent;
  border: 1.5px solid var(--color-primary);
  color: var(--color-primary);
  border-radius: $radius-sm;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(66, 153, 225, 0.08);
  }

  &.active {
    background: #e53e3e;
    border-color: #e53e3e;
    color: #fff;

    &:hover {
      background: #c53030;
    }
  }
}

.try-it-out-form {
  background: #1a1a2e;
  border: 1px solid #2d2d4e;
  border-radius: $radius-md;
  padding: $spacing-md;
  margin-bottom: $spacing-md;
}

.tio-section-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
  margin: $spacing-md 0 $spacing-xs;

  &:first-child {
    margin-top: 0;
  }
}

.tio-param-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: $spacing-xs $spacing-sm;
  align-items: start;
  margin-bottom: $spacing-xs;
}

.tio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #d1d5db;
  padding-top: 6px;
  flex-wrap: wrap;
}

.tio-required {
  color: #f87171;
  font-size: 0.85rem;
}

.tio-in-badge {
  font-size: 0.6rem;
  font-weight: 500;
  background: #2d2d4e;
  color: #8b9cf4;
  border: 1px solid #3d3d6e;
  border-radius: 3px;
  padding: 1px 4px;
  text-transform: uppercase;
}

.tio-input {
  width: 100%;
  padding: 6px $spacing-sm;
  font-size: 0.8rem;
  font-family: 'Monaco', 'Menlo', monospace;
  background: #0f0f1e;
  color: #d4d4d4;
  border: 1px solid #3d3d6e;
  border-radius: $radius-sm;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #6366f1;
  }

  &::placeholder {
    color: #4b5563;
  }
}

.tio-desc {
  grid-column: 2;
  font-size: 0.7rem;
  color: #6b7280;
  margin-top: -2px;
}

.tio-body-textarea {
  width: 100%;
  padding: $spacing-sm;
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', monospace;
  background: #0f0f1e;
  color: #d4d4d4;
  border: 1px solid #3d3d6e;
  border-radius: $radius-sm;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  line-height: 1.5;

  &:focus {
    border-color: #6366f1;
  }

  &::placeholder {
    color: #4b5563;
  }
}

.tio-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-top: $spacing-md;
  flex-wrap: wrap;
}

.tio-execute-btn {
  padding: 7px $spacing-lg;
  font-size: 0.85rem;
  font-weight: 700;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #4338ca;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.tio-base-url {
  font-size: 0.72rem;
  color: #6b7280;
  font-family: 'Monaco', 'Menlo', monospace;

  &.tio-base-url-warn {
    color: #f59e0b;
  }
}

// ─── Try it out 응답 패널 ───────────────────────────────────────────────────

.tio-response-panel {
  margin-top: $spacing-md;
  border-top: 1px solid #2d2d4e;
  padding-top: $spacing-md;
}

.tio-response-header {
  margin-bottom: $spacing-sm;
}

.tio-response-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #d1d5db;
}

.tio-response-loading {
  font-size: 0.8rem;
  color: #9ca3af;
  padding: $spacing-sm 0;
}

.tio-response-error {
  font-size: 0.8rem;
  color: #f87171;
  padding: $spacing-sm;
  background: #2d1b1b;
  border: 1px solid #5c2626;
  border-radius: $radius-sm;
}

.tio-response-section {
  margin-bottom: $spacing-md;
}

.tio-response-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  margin-bottom: $spacing-xs;
}

.tio-response-url {
  font-size: 0.75rem;
  font-family: 'Monaco', 'Menlo', monospace;
  color: #a5b4fc;
  word-break: break-all;
  padding: $spacing-xs $spacing-sm;
  background: #0f0f1e;
  border-radius: $radius-sm;
}

.tio-curl-block {
  white-space: pre-wrap;
}

.tio-status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: $radius-sm;
  font-size: 0.8rem;
  font-weight: 700;

  &.status-success {
    background: #064e3b;
    color: #6ee7b7;
  }

  &.status-redirect {
    background: #1e1b4b;
    color: #a5b4fc;
  }

  &.status-client-error {
    background: #451a03;
    color: #fed7aa;
  }

  &.status-server-error {
    background: #450a0a;
    color: #fca5a5;
  }
}

.copy-toast {
  position: fixed;
  transform: translate(-50%, -100%);
  z-index: 9999;
  padding: 6px 12px;
  border-radius: $radius-sm;
  background: #1e293b;
  color: #f8fafc;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.24);
  pointer-events: none;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% + 6px));
}

@include mobile {
  .api-list {
    max-height: 400px;
  }

  .api-main {
    flex-wrap: wrap;
  }

  .api-method {
    min-width: 50px;
  }

  .code-block {
    font-size: 0.65rem;
  }

  .response-item {
    flex-direction: column;
  }
}
</style>
